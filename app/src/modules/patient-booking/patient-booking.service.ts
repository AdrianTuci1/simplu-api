import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceEntity } from '../resources/entities/resource.entity';
import { BusinessInfoService } from '../business-info/business-info.service';
import { KinesisService } from '../../kinesis.service';
import { CognitoUser } from '../auth/auth.service';

export interface Slot {
  start: string; // ISO time HH:mm
  end: string; // ISO time HH:mm
}

@Injectable()
export class PatientBookingService {
  private readonly logger = new Logger(PatientBookingService.name);

  constructor(
    @InjectRepository(ResourceEntity)
    private readonly resourceRepo: Repository<ResourceEntity>,
    private readonly businessInfoService: BusinessInfoService,
    private readonly kinesisService: KinesisService,
  ) {}

  async listPublicServices(
    businessId: string,
    locationId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const businessLocationId = `${businessId}-${locationId}`;
    const qb = this.resourceRepo
      .createQueryBuilder('resource')
      .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
      .andWhere('resource.resourceType = :type', { type: 'service' })
      .andWhere("(resource.data->>'public')::boolean = true")
      .orderBy('resource.startDate', 'DESC')
      .addOrderBy('resource.createdAt', 'DESC')
      .limit(limit)
      .offset((page - 1) * limit);

    const items = await qb.getMany();
    return { success: true, data: items.map(i => ({ id: i.resourceId, ...i.data })) };
  }

  async getAvailableDates(
    businessId: string,
    locationId: string,
    from: string,
    to: string,
    serviceId?: string,
  ) {
    // Pull all appointments in range and compute which dates still have capacity
    const businessLocationId = `${businessId}-${locationId}`;

    // Fetch appointments for date range
    const qb = this.resourceRepo
      .createQueryBuilder('resource')
      .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
      .andWhere('resource.resourceType = :type', { type: 'appointment' })
      .andWhere('resource.startDate >= :from AND resource.startDate <= :to', { from, to });

    if (serviceId) {
      qb.andWhere("(resource.data->>'serviceId' = :serviceId OR resource.data->'service'->>'id' = :serviceId)", { serviceId });
    }

    const appts = await qb.getMany();

    // Group by date
    const byDate: Record<string, ResourceEntity[]> = {};
    for (const a of appts) {
      const d = a.startDate;
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(a);
    }

    // Working hours per day
    const settings = await this.businessInfoService.getBusinessSettings(businessId);
    const availableDates: string[] = [];

    // Iterate each date in range
    const dateCursor = new Date(from + 'T00:00:00Z');
    const endDate = new Date(to + 'T00:00:00Z');
    while (dateCursor <= endDate) {
      const dateStr = dateCursor.toISOString().slice(0, 10);
      const weekday = dateCursor.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const wh = (settings as any)?.workingHours?.[weekday];
      if (!wh || !wh.isOpen) {
        dateCursor.setUTCDate(dateCursor.getUTCDate() + 1);
        continue;
      }

      // Compute free slots quickly: if there is any gap between open-close not fully consumed by appointments
      const occupied = (byDate[dateStr] || []).map((a) => this.toSlot((a.data as any)?.time, (a.data as any)?.service?.duration));
      const free = this.computeFreeSlots(wh.open, wh.close, occupied);
      if (free.length > 0) availableDates.push(dateStr);

      dateCursor.setUTCDate(dateCursor.getUTCDate() + 1);
    }

    return { success: true, data: availableDates };
  }

  async getDaySlots(
    businessId: string,
    locationId: string,
    date: string,
  ) {
    const businessLocationId = `${businessId}-${locationId}`;
    const settings = await this.businessInfoService.getBusinessSettings(businessId);

    const day = new Date(date + 'T00:00:00Z');
    const weekday = day.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const wh = (settings as any)?.workingHours?.[weekday];
    if (!wh || !wh.isOpen) return { success: true, data: [] };

    const appts = await this.resourceRepo
      .createQueryBuilder('resource')
      .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
      .andWhere('resource.resourceType = :type', { type: 'appointment' })
      .andWhere('resource.startDate = :date', { date })
      .getMany();

    const occupied = appts.map((a) => this.toSlot((a.data as any)?.time, (a.data as any)?.service?.duration));
    const free = this.computeFreeSlots(wh.open, wh.close, occupied);

    return { success: true, data: free };
  }

  async reserve(
    businessId: string,
    locationId: string,
    payload: {
      date: string;
      time: string;
      serviceId: string;
      duration?: number;
      customer?: { name?: string; email?: string; phone?: string };
    },
    user?: CognitoUser,
  ) {
    // Basic conflict check in single transaction
    const { date, time, serviceId, duration } = payload;
    if (!date || !time || !serviceId) throw new BadRequestException('date, time, serviceId required');

    const businessLocationId = `${businessId}-${locationId}`;

    // Find overlapping appointments
    const overlap = await this.resourceRepo.query(
      `
      WITH params AS (
        SELECT $1::text AS business_location_id, $2::date AS date, $3::time AS start_time, $4::int AS dur
      )
      SELECT r.*
      FROM resources r, params p
      WHERE r.business_location_id = p.business_location_id
        AND r.resource_type = 'appointment'
        AND r.start_date = p.date
        AND (
          (
            (r.data->>'time')::time, ((r.data->'service'->>'duration')::int) * interval '1 minute'
          ) OVERLAPS (p.start_time, p.dur * interval '1 minute')
        )
      LIMIT 1
      `,
      [businessLocationId, date, time, duration ?? 0],
    );

    if (overlap.length > 0) {
      throw new BadRequestException('Selected time is no longer available');
    }

    // Publish appointment create to Kinesis for async creation
    const operation = {
      operation: 'create',
      businessId,
      locationId,
      resourceType: 'appointment',
      data: {
        date,
        time,
        serviceId,
        service: { id: serviceId, duration: duration },
        customer: payload.customer,
        createdBy: user ? { userId: user.userId, email: user.email } : { userId: 'guest' },
      },
      timestamp: new Date().toISOString(),
      requestId: Date.now().toString(),
    } as any;

    await this.kinesisService.sendResourceOperation(operation);
    return { success: true, message: 'Reservation accepted', requestId: operation.requestId };
  }

  async getAppointmentHistory(
    businessId: string,
    locationId: string,
    params: { from?: string; to?: string; status?: string; page?: number; limit?: number },
    user?: CognitoUser,
  ) {
    const businessLocationId = `${businessId}-${locationId}`;
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 50, 200);

    const qb = this.resourceRepo
      .createQueryBuilder('resource')
      .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
      .andWhere('resource.resourceType = :type', { type: 'appointment' })
      .orderBy('resource.startDate', 'DESC')
      .addOrderBy('resource.createdAt', 'DESC')
      .limit(limit)
      .offset((page - 1) * limit);

    if (params.from) {
      qb.andWhere('resource.startDate >= :from', { from: params.from });
    }
    if (params.to) {
      qb.andWhere('resource.startDate <= :to', { to: params.to });
    }
    if (params.status) {
      qb.andWhere("resource.data->>'status' = :status", { status: params.status });
    }

    // Enforce ownership: createdBy.userId OR various owner fields OR customer.email
    if (user?.userId) {
      qb.andWhere(
        `(
          resource.data->'createdBy'->>'userId' = :userId OR
          resource.data->>'ownerId' = :userId OR
          resource.data->>'userId' = :userId OR
          resource.data->>'patientId' = :userId OR
          resource.data->>'customerId' = :userId OR
          resource.data->>'email' = :userEmail OR
          resource.data->'customer'->>'email' = :userEmail
        )`,
        { userId: user.userId, userEmail: user.email },
      );
    }

    const items = await qb.getMany();
    return { success: true, data: items.map(i => ({ id: i.resourceId, date: i.startDate, ...i.data })) };
  }

  async modifyScheduledAppointment(
    businessId: string,
    locationId: string,
    appointmentId: string,
    payload: { date?: string; time?: string; serviceId?: string; duration?: number; customer?: { name?: string; email?: string; phone?: string } },
    user?: CognitoUser,
  ) {
    const businessLocationId = `${businessId}-${locationId}`;

    // Read existing appointment to ensure it's scheduled and for overlap checks
    const existing = await this.resourceRepo
      .createQueryBuilder('resource')
      .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
      .andWhere('resource.resourceType = :type', { type: 'appointment' })
      .andWhere('resource.resourceId = :id', { id: appointmentId })
      .getOne();

    if (!existing) {
      throw new BadRequestException('Appointment not found');
    }

    const currentStatus = (existing.data as any)?.status || 'scheduled';

    // Ownership check: only owner can modify
    const createdByUserId: string | undefined = (existing.data as any)?.createdBy?.userId;
    const customerEmail: string | undefined = (existing.data as any)?.customer?.email;
    const isOwner = (createdByUserId && user?.userId === createdByUserId) || (customerEmail && user?.email === customerEmail);
    if (!isOwner) {
      throw new ForbiddenException('You do not have permission to modify this appointment');
    }
    if (currentStatus !== 'scheduled') {
      throw new BadRequestException('Only appointments with status "scheduled" can be modified');
    }

    const newDate = payload.date ?? existing.startDate;
    const newTime = payload.time ?? (existing.data as any)?.time;
    const newServiceId = payload.serviceId ?? (existing.data as any)?.service?.id;
    const newDuration = payload.duration ?? (existing.data as any)?.service?.duration ?? 0;

    if (!newDate || !newTime || !newServiceId) {
      throw new BadRequestException('date, time, serviceId are required for modification');
    }

    // Conflict check for the new slot
    const overlap = await this.resourceRepo.query(
      `
      WITH params AS (
        SELECT $1::text AS business_location_id, $2::date AS date, $3::time AS start_time, $4::int AS dur, $5::text AS exclude_id
      )
      SELECT r.*
      FROM resources r, params p
      WHERE r.business_location_id = p.business_location_id
        AND r.resource_type = 'appointment'
        AND r.resource_id <> p.exclude_id
        AND r.start_date = p.date
        AND (
          (
            (r.data->>'time')::time, ((r.data->'service'->>'duration')::int) * interval '1 minute'
          ) OVERLAPS (p.start_time, p.dur * interval '1 minute')
        )
      LIMIT 1
      `,
      [businessLocationId, newDate, newTime, newDuration, appointmentId],
    );

    if (overlap.length > 0) {
      throw new BadRequestException('Selected time is no longer available');
    }

    // Send update operation to Kinesis
    const operation = {
      operation: 'update',
      businessId,
      locationId,
      resourceType: 'appointment',
      resourceId: appointmentId,
      data: {
        date: newDate,
        time: newTime,
        serviceId: newServiceId,
        service: { id: newServiceId, duration: newDuration },
        customer: payload.customer ?? (existing.data as any)?.customer,
        status: 'scheduled',
        updatedBy: user ? { userId: user.userId, email: user.email } : { userId: 'system' },
      },
      timestamp: new Date().toISOString(),
      requestId: Date.now().toString(),
    } as any;

    await this.kinesisService.sendResourceOperation(operation);
    return { success: true, message: 'Modification accepted', requestId: operation.requestId };
  }

  async getUserResourcesByType(
    businessId: string,
    locationId: string,
    resourceType: string,
    user: CognitoUser,
    page: number = 1,
    limit: number = 50,
  ) {
    const businessLocationId = `${businessId}-${locationId}`;
    const qb = this.resourceRepo
      .createQueryBuilder('resource')
      .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
      .andWhere('resource.resourceType = :resourceType', { resourceType })
      .orderBy('resource.createdAt', 'DESC')
      .limit(Math.min(limit, 200))
      .offset((page - 1) * Math.min(limit, 200));

    // Enforce ownership
    qb.andWhere(
      `(
        resource.data->'createdBy'->>'userId' = :userId OR
        resource.data->>'ownerId' = :userId OR
        resource.data->>'userId' = :userId OR
        resource.data->>'patientId' = :userId OR
        resource.data->>'customerId' = :userId OR
        resource.data->>'email' = :userEmail OR
        resource.data->'customer'->>'email' = :userEmail
      )`,
      { userId: user.userId, userEmail: user.email },
    );

    const items = await qb.getMany();
    return { success: true, data: items.map(i => ({ id: i.resourceId, ...i.data })) };
  }

  private toSlot(time: string | undefined, duration?: number): Slot | null {
    if (!time) return null;
    const start = time;
    const end = this.addMinutes(time, duration ?? 0);
    return { start, end };
  }

  private addMinutes(hhmm: string, minutes: number): string {
    const [h, m] = hhmm.split(':').map(Number);
    const total = h * 60 + m + minutes;
    const hh = Math.floor(total / 60) % 24;
    const mm = total % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  private computeFreeSlots(open: string, close: string, occupied: Array<Slot | null>, granularityMinutes: number = 15): Slot[] {
    const busy = occupied.filter((s): s is Slot => !!s).sort((a, b) => a.start.localeCompare(b.start));
    const result: Slot[] = [];
    let cursor = open;
    for (const b of busy) {
      if (this.compareTimes(cursor, b.start) < 0) {
        result.push({ start: cursor, end: b.start });
      }
      if (this.compareTimes(cursor, b.end) < 0) {
        cursor = b.end;
      }
    }
    if (this.compareTimes(cursor, close) < 0) {
      result.push({ start: cursor, end: close });
    }
    // Normalize to granularity
    return this.sliceIntoGranularity(result, granularityMinutes);
  }

  private compareTimes(a: string, b: string): number {
    return a.localeCompare(b);
  }

  private sliceIntoGranularity(slots: Slot[], granularity: number): Slot[] {
    const sliced: Slot[] = [];
    for (const s of slots) {
      let t = s.start;
      while (this.compareTimes(this.addMinutes(t, granularity), s.end) <= 0) {
        const next = this.addMinutes(t, granularity);
        sliced.push({ start: t, end: next });
        t = next;
      }
    }
    return sliced;
  }
}


