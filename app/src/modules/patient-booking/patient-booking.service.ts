import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceEntity } from '../resources/entities/resource.entity';
import { BusinessInfoService } from '../business-info/business-info.service';
import { KinesisService } from '../../kinesis.service';
import { CognitoUser } from '../auth/auth.service';
import { MessageAutomationService, AppointmentData } from '../../services/message-automation.service';
import { ExternalApiConfigService } from '../../services/external-api-config.service';

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
    private readonly messageAutomationService: MessageAutomationService,
    private readonly externalApiConfigService: ExternalApiConfigService,
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
      .andWhere('resource.resourceType = :type', { type: 'treatment' })
      .andWhere("(resource.data->>'isPublic')::boolean = true")
      .orderBy('resource.startDate', 'DESC')
      .addOrderBy('resource.createdAt', 'DESC')
      .limit(limit)
      .offset((page - 1) * limit);

    const items = await qb.getMany();
    return { success: true, data: items.map(i => ({ id: i.resourceId, ...i.data })) };
  }



  async getAvailableDatesWithSlots(
    businessId: string,
    locationId: string,
    from: string,
    to: string,
    serviceId?: string,
    medicId?: string,
  ) {
    const businessLocationId = `${businessId}-${locationId}`;
    
    this.logger.debug(`Getting available dates with slots for ${businessLocationId} from ${from} to ${to}, serviceId: ${serviceId}, medicId: ${medicId}`);

    // Build medic query
    const medicQuery = this.resourceRepo
      .createQueryBuilder('resource')
      .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
      .andWhere('resource.resourceType = :type', { type: 'medic' })
      .andWhere('resource.data->>canTakeAppointments = :canTakeAppointments', { canTakeAppointments: true });
    
    // Filter by specific medic if provided
    if (medicId) {
      medicQuery.andWhere('resource.resourceId = :medicId', { medicId });
    }

    // Fetch all required data in parallel for better performance
    const [workingHoursSettings, medics, appointments, service] = await Promise.all([
      // Get working hours from settings resource
      this.resourceRepo
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
        .andWhere('resource.resourceType = :type', { type: 'setting' })
        .andWhere("resource.data->>'settingType' = 'working-hours'")
        .getOne(),
      
      // Get all medics (or specific medic) with duty days
      medicQuery.getMany(),
      
      // Fetch appointments for date range
      this.getAppointmentsInRange(businessLocationId, from, to, serviceId, medicId),
      
      // Get service details if serviceId provided
      serviceId ? this.getServiceDetails(businessLocationId, serviceId) : Promise.resolve(null)
    ]);

    // Parse working hours from settings
    const workingHours = workingHoursSettings?.data?.days || [];
    const workingHoursMap = this.buildWorkingHoursMap(workingHours);

    // Group appointments by date and medic
    const appointmentsByDate = this.groupAppointmentsByDateAndMedic(appointments);

    // Get service duration
    const serviceDuration = service?.data?.duration || 0;

    const availableDatesWithSlots: Array<{ date: string; slots: Slot[] }> = [];
    const dateCursor = new Date(from + 'T00:00:00Z');
    const endDate = new Date(to + 'T00:00:00Z');

    while (dateCursor <= endDate) {
      const dateStr = dateCursor.toISOString().slice(0, 10);
      const weekday = this.getWeekdayKey(dateCursor);
      
      // Check if business is open on this day
      const dayWorkingHours = workingHoursMap[weekday];
      if (!dayWorkingHours || !dayWorkingHours.isWorking) {
        dateCursor.setUTCDate(dateCursor.getUTCDate() + 1);
        continue;
      }

      // Check if any medic is available on this day
      const availableMedics = medics.filter(medic => 
        this.isMedicAvailableOnDay(medic, weekday)
      );

      if (availableMedics.length === 0) {
        dateCursor.setUTCDate(dateCursor.getUTCDate() + 1);
        continue;
      }

      // Calculate slots for this date
      const slots = this.calculateSlotsForDate(
        dateStr,
        dayWorkingHours,
        availableMedics,
        appointmentsByDate[dateStr] || {},
        serviceDuration
      );

      // Only include dates with available slots
      if (slots.length > 0) {
        availableDatesWithSlots.push({
          date: dateStr,
          slots
        });
      }

      dateCursor.setUTCDate(dateCursor.getUTCDate() + 1);
    }

    this.logger.debug(`Final available dates with slots: ${availableDatesWithSlots.length} dates`);
    return { success: true, data: availableDatesWithSlots };
  }

  private calculateSlotsForDate(
    dateStr: string,
    dayWorkingHours: any,
    availableMedics: ResourceEntity[],
    appointmentsByMedic: Record<string, ResourceEntity[]>,
    serviceDuration: number
  ): Slot[] {
    const candidateSlots: Slot[] = [];

    for (const medic of availableMedics) {
      const medicId = medic.resourceId;
      const medicAppointments = appointmentsByMedic[medicId] || [];

      // Convert appointments to occupied slots
      const occupied = medicAppointments.map((a) =>
        this.toSlot((a.data as any)?.time, (a.data as any)?.service?.duration)
      );

      // Compute continuous free intervals for this medic
      const freeIntervals = this.computeFreeIntervals(
        dayWorkingHours.startTime,
        dayWorkingHours.endTime,
        occupied,
      );

      if (serviceDuration > 0) {
        // Generate service-sized slots within the free intervals
        const serviceSlots = this.generateServiceSlots(freeIntervals, serviceDuration);
        candidateSlots.push(...serviceSlots);
      } else {
        // Default granularity to 15 minutes across free intervals
        const sliced = this.sliceIntoGranularity(freeIntervals, 15);
        candidateSlots.push(...sliced);
      }
    }

    // Deduplicate by time window (start+end), ignoring medic
    return this.deduplicateSlots(candidateSlots);
  }



  async reserve(
    businessId: string,
    locationId: string,
    payload: {
      date: string;
      time: string;
      serviceId: string;
      duration?: number;
      medicId?: string;
      customer: { name?: string; email?: string; phone?: string };
    },
  ) {
    const { date, time, serviceId, duration, customer } = payload;
    if (!date || !time || !serviceId) throw new BadRequestException('date, time, serviceId required');
    if (!customer || !customer.email) throw new BadRequestException('customer email is required');

    const businessLocationId = `${businessId}-${locationId}`;

    // Auto-assign medic if not provided
    let medicId = payload.medicId;
    if (!medicId) {
      medicId = await this.autoAssignMedic(businessLocationId, date, time, duration || 0);
    }
    
    // Get service details for price
    const service = await this.getServiceDetails(businessLocationId, serviceId);
    const servicePrice = service?.data?.price || 0;
    
    // Get medic details for name
    const medic = await this.resourceRepo
      .createQueryBuilder('resource')
      .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
      .andWhere('resource.resourceType = :type', { type: 'medic' })
      .andWhere('resource.resourceId = :medicId', { medicId })
      .getOne();
    const medicName = medic?.data?.name || 'Unknown Medic';

    // Enhanced conflict check with medic consideration
    const overlap = await this.resourceRepo.query(
      `
      WITH params AS (
        SELECT $1::text AS business_location_id, $2::date AS date, $3::time AS start_time, $4::int AS dur, $5::text AS medic_id
      )
      SELECT r.*
      FROM resources r, params p
      WHERE r.business_location_id = p.business_location_id
        AND r.resource_type = 'appointment'
        AND r.start_date = p.date
        AND (
          p.medic_id IS NULL OR 
          r.data->'medic'->>'id' = p.medic_id OR 
          (p.medic_id = 'default' AND (r.data->'medic'->>'id' IS NULL OR r.data->'medic'->>'id' = ''))
        )
        AND (
          (
            (r.data->>'time')::time, ((r.data->'service'->>'duration')::int) * interval '1 minute'
          ) OVERLAPS (p.start_time, p.dur * interval '1 minute')
        )
      LIMIT 1
      `,
      [businessLocationId, date, time, duration ?? 0, medicId || null],
    );

    if (overlap.length > 0) {
      throw new BadRequestException('Selected time is no longer available');
    }

    // Validate medic availability if medicId is provided
    if (medicId) {
      const medic = await this.resourceRepo
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
        .andWhere('resource.resourceType = :type', { type: 'medic' })
        .andWhere('resource.resourceId = :medicId', { medicId })
        .getOne();

      if (!medic) {
        throw new BadRequestException('Medic not found');
      }

      const day = new Date(date + 'T00:00:00Z');
      const weekday = this.getWeekdayKey(day);
      
      if (!this.isMedicAvailableOnDay(medic, weekday)) {
        throw new BadRequestException('Medic is not available on this day');
      }
    }

    // Publish appointment create to Kinesis for async creation
    // resources-server va face find-or-create patient automat
    const operation = {
      operation: 'create',
      businessId,
      locationId,
      resourceType: 'appointment',
      data: {
        date,
        time,
        serviceId,
        service: { 
          id: serviceId, 
          duration: duration,
          price: servicePrice
        },
        medic: { 
          id: medicId,
          name: medicName
        },
        customer: payload.customer, // Trimitem datele customerului, resources-server va crea pacientul
        createdBy: { 
          userId: 'guest', 
          email: payload.customer.email,
          name: payload.customer.name 
        },
        mention: 'string',
        createdByPatient: true, // Flag pentru resources-server să știe că trebuie să facă find-or-create patient
      },
      timestamp: new Date().toISOString(),
      requestId: Date.now().toString(),
    } as any;

    await this.kinesisService.sendResourceOperation(operation);
    
    // Send automated messages if services are enabled
    await this.sendAutomatedMessages(businessId, locationId, {
      patientName: customer.name || 'Patient',
      patientPhone: customer.phone,
      patientEmail: customer.email,
      appointmentDate: this.formatDate(date),
      appointmentTime: time,
      businessName: '', // Will be populated from business info
      locationName: '', // Will be populated from location info
      serviceName: service?.data?.name || 'Service',
      doctorName: medicName,
      phoneNumber: '' // Will be populated from business info
    });

    return { success: true, message: 'Reservation accepted', requestId: operation.requestId };
  }

  async getAppointmentHistory(
    businessId: string,
    locationId: string,
    params: { email: string; from?: string; to?: string; status?: string; page?: number; limit?: number },
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

    // Enforce ownership: filter by customer email
    if (params.email) {
      qb.andWhere(
        `(
          resource.data->'customer'->>'email' = :customerEmail OR
          resource.data->>'email' = :customerEmail
        )`,
        { customerEmail: params.email },
      );
    }

    const items = await qb.getMany();
    return { success: true, data: items.map(i => ({ id: i.resourceId, date: i.startDate, ...i.data })) };
  }

  async modifyScheduledAppointment(
    businessId: string,
    locationId: string,
    appointmentId: string,
    payload: { date?: string; time?: string; serviceId?: string; duration?: number; medicId?: string; customer: { name?: string; email?: string; phone?: string } },
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

    // Ownership check: only customer with matching email can modify
    const existingCustomerEmail: string | undefined = (existing.data as any)?.customer?.email;
    const providedCustomerEmail: string | undefined = payload.customer?.email;
    
    if (!providedCustomerEmail) {
      throw new BadRequestException('Customer email is required for modification');
    }
    
    if (existingCustomerEmail !== providedCustomerEmail) {
      throw new ForbiddenException('You can only modify appointments associated with your email address');
    }
    if (currentStatus !== 'scheduled') {
      throw new BadRequestException('Only appointments with status "scheduled" can be modified');
    }

    const newDate = payload.date ?? existing.startDate;
    const newTime = payload.time ?? (existing.data as any)?.time;
    const newServiceId = payload.serviceId ?? (existing.data as any)?.service?.id;
    const newDuration = payload.duration ?? (existing.data as any)?.service?.duration ?? 0;
    const newMedicId = payload.medicId ?? (existing.data as any)?.medic?.id;
    
    // Get service details for price
    const service = await this.getServiceDetails(businessLocationId, newServiceId);
    const servicePrice = service?.data?.price || 0;
    
    // Get medic details for name
    const medic = newMedicId ? await this.resourceRepo
      .createQueryBuilder('resource')
      .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
      .andWhere('resource.resourceType = :type', { type: 'medic' })
      .andWhere('resource.resourceId = :medicId', { medicId: newMedicId })
      .getOne() : null;
    const medicName = medic?.data?.name || 'Unknown Medic';

    if (!newDate || !newTime || !newServiceId) {
      throw new BadRequestException('date, time, serviceId are required for modification');
    }

    // Validate medic availability if medicId is provided
    if (newMedicId) {
      const medic = await this.resourceRepo
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
        .andWhere('resource.resourceType = :type', { type: 'medic' })
        .andWhere('resource.resourceId = :medicId', { medicId: newMedicId })
        .getOne();

      if (!medic) {
        throw new BadRequestException('Medic not found');
      }

      const day = new Date(newDate + 'T00:00:00Z');
      const weekday = this.getWeekdayKey(day);
      
      if (!this.isMedicAvailableOnDay(medic, weekday)) {
        throw new BadRequestException('Medic is not available on this day');
      }
    }

    // Conflict check for the new slot with medic consideration
    const overlap = await this.resourceRepo.query(
      `
      WITH params AS (
        SELECT $1::text AS business_location_id, $2::date AS date, $3::time AS start_time, $4::int AS dur, $5::text AS exclude_id, $6::text AS medic_id
      )
      SELECT r.*
      FROM resources r, params p
      WHERE r.business_location_id = p.business_location_id
        AND r.resource_type = 'appointment'
        AND r.resource_id <> p.exclude_id
        AND r.start_date = p.date
        AND (
          p.medic_id IS NULL OR 
          r.data->'medic'->>'id' = p.medic_id OR 
          (p.medic_id = 'default' AND (r.data->'medic'->>'id' IS NULL OR r.data->'medic'->>'id' = ''))
        )
        AND (
          (
            (r.data->>'time')::time, ((r.data->'service'->>'duration')::int) * interval '1 minute'
          ) OVERLAPS (p.start_time, p.dur * interval '1 minute')
        )
      LIMIT 1
      `,
      [businessLocationId, newDate, newTime, newDuration, appointmentId, newMedicId || null],
    );

    if (overlap.length > 0) {
      throw new BadRequestException('Selected time is no longer available');
    }

    // Send update operation to Kinesis
    // resources-server va face find-or-create patient automat
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
        service: { 
          id: newServiceId, 
          duration: newDuration,
          price: servicePrice
        },
        medic: newMedicId ? { 
          id: newMedicId,
          name: medicName
        } : undefined,
        customer: payload.customer ?? (existing.data as any)?.customer,
        status: 'scheduled',
        createdByPatient: true, // Flag pentru resources-server să știe că trebuie să facă find-or-create patient
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

  // Compute continuous free intervals without slicing (used for service-duration checks)
  private computeFreeIntervals(open: string, close: string, occupied: Array<Slot | null>): Slot[] {
    const busy = occupied
      .filter((s): s is Slot => !!s)
      .sort((a, b) => a.start.localeCompare(b.start));
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
    return result;
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

  private canAccommodateService(slot: Slot, serviceDuration: number): boolean {
    const slotDuration = this.getSlotDuration(slot);
    return slotDuration >= serviceDuration;
  }

  private getSlotDuration(slot: Slot): number {
    const startTime = this.timeToMinutes(slot.start);
    const endTime = this.timeToMinutes(slot.end);
    return endTime - startTime;
  }

  private roundUpToGranularity(time: string, granularity: number): string {
    const minutes = this.timeToMinutes(time);
    const remainder = minutes % granularity;
    if (remainder === 0) return time;
    return this.minutesToTime(minutes + (granularity - remainder));
  }

  private minutesToTime(totalMinutes: number): string {
    const hh = Math.floor(totalMinutes / 60) % 24;
    const mm = totalMinutes % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  private generateServiceSlots(intervals: Slot[], serviceDuration: number, granularityMinutes: number = 15): Slot[] {
    if (serviceDuration <= 0) return [];
    const slots: Slot[] = [];
    for (const interval of intervals) {
      let start = this.roundUpToGranularity(interval.start, granularityMinutes);
      const intervalEndMinutes = this.timeToMinutes(interval.end);
      while (true) {
        const endForService = this.addMinutes(start, serviceDuration);
        if (this.timeToMinutes(endForService) > intervalEndMinutes) break;
        slots.push({ start, end: endForService });
        start = this.addMinutes(start, granularityMinutes);
      }
    }
    return slots;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Helper methods for the new optimized logic

  private async getAppointmentsInRange(
    businessLocationId: string,
    from: string,
    to: string,
    serviceId?: string,
    medicId?: string
  ): Promise<ResourceEntity[]> {
    const qb = this.resourceRepo
      .createQueryBuilder('resource')
      .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
      .andWhere('resource.resourceType = :type', { type: 'appointment' })
      .andWhere('resource.startDate >= :from AND resource.startDate <= :to', { from, to });

    if (serviceId) {
      qb.andWhere("(resource.data->>'serviceId' = :serviceId OR resource.data->'service'->>'id' = :serviceId)", { serviceId });
    }

    if (medicId) {
      qb.andWhere("resource.data->'medic'->>'id' = :medicId", { medicId });
    }

    return qb.getMany();
  }

  private async getServiceDetails(businessLocationId: string, serviceId: string): Promise<ResourceEntity | null> {
    return this.resourceRepo
      .createQueryBuilder('resource')
      .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
      .andWhere('resource.resourceType = :type', { type: 'settings' })
      .andWhere('resource.resourceId = :serviceId', { serviceId })
      .getOne();
  }

  private buildWorkingHoursMap(workingHours: any[]): Record<string, any> {
    const map: Record<string, any> = {};
    for (const day of workingHours) {
      if (day.key) {
        map[day.key] = {
          isWorking: day.isWorking,
          startTime: day.startTime,
          endTime: day.endTime
        };
      }
    }
    return map;
  }

  private getWeekdayKey(date: Date): string {
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return weekdays[date.getUTCDay()];
  }

  private isMedicAvailableOnDay(medic: ResourceEntity, weekday: string): boolean {
    const dutyDays = medic.data?.dutyDays || [];
    this.logger.debug(`Checking medic ${medic.resourceId} for ${weekday}, dutyDays: ${JSON.stringify(dutyDays)}`);
    
    // Check if medic works on this weekday (support RO and EN labels, with/without diacritics)
    const isAvailable = dutyDays.some((dayLabel: string) => {
      const englishDay = this.toEnglishWeekdayKeyFromLabel(dayLabel);
      this.logger.debug(`Duty day label "${dayLabel}" normalized to "${englishDay}"; compare with ${weekday}`);
      return englishDay === weekday;
    });
    
    this.logger.debug(`Medic ${medic.resourceId} available on ${weekday}: ${isAvailable}`);
    return isAvailable;
  }

  private toEnglishWeekdayKeyFromLabel(label: string): string | null {
    if (!label) return null;
    const english = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const lower = String(label).trim().toLowerCase();

    // Already an English weekday
    if (english.includes(lower)) return lower;

    // Remove common Romanian diacritics for robust matching
    const noDiacritics = lower
      .replace(/ș/g, 's').replace(/ş/g, 's')
      .replace(/ț/g, 't').replace(/ţ/g, 't')
      .replace(/ă/g, 'a')
      .replace(/â/g, 'a')
      .replace(/î/g, 'i');

    switch (noDiacritics) {
      case 'luni': return 'monday';
      case 'marti': return 'tuesday';
      case 'miercuri': return 'wednesday';
      case 'joi': return 'thursday';
      case 'vineri': return 'friday';
      case 'sambata': return 'saturday';
      case 'duminica': return 'sunday';
      default:
        // Try capitalized Romanian with diacritics as a fallback map
        const map: Record<string, string> = {
          'luni': 'monday',
          'marți': 'tuesday',
          'miercuri': 'wednesday',
          'joi': 'thursday',
          'vineri': 'friday',
          'sâmbătă': 'saturday',
          'duminică': 'sunday',
        };
        return map[lower] || null;
    }
  }

  private groupAppointmentsByDateAndMedic(appointments: ResourceEntity[]): Record<string, Record<string, ResourceEntity[]>> {
    const grouped: Record<string, Record<string, ResourceEntity[]>> = {};
    
    for (const appointment of appointments) {
      const date = appointment.startDate;
      const medicId = (appointment.data as any)?.medic?.id || 'default';
      
      if (!grouped[date]) grouped[date] = {};
      if (!grouped[date][medicId]) grouped[date][medicId] = [];
      
      grouped[date][medicId].push(appointment);
    }
    
    return grouped;
  }

  private groupAppointmentsByMedic(appointments: ResourceEntity[]): Record<string, ResourceEntity[]> {
    const grouped: Record<string, ResourceEntity[]> = {};
    
    for (const appointment of appointments) {
      const medicId = (appointment.data as any)?.medic?.id || 'default';
      if (!grouped[medicId]) grouped[medicId] = [];
      grouped[medicId].push(appointment);
    }
    
    return grouped;
  }

  private checkDateAvailability(
    dateStr: string,
    dayWorkingHours: any,
    availableMedics: ResourceEntity[],
    appointmentsByMedic: Record<string, ResourceEntity[]>,
    serviceDuration: number
  ): boolean {
    // Quick check: if no medics available, no slots
    if (availableMedics.length === 0) return false;

    // Check if any medic has free slots
    for (const medic of availableMedics) {
      const medicId = medic.resourceId;
      const medicAppointments = appointmentsByMedic[medicId] || [];
      
      // Convert appointments to occupied slots
      const occupied = medicAppointments.map((a) => 
        this.toSlot((a.data as any)?.time, (a.data as any)?.service?.duration)
      );

      // Compute continuous free intervals for this medic
      const freeIntervals = this.computeFreeIntervals(dayWorkingHours.startTime, dayWorkingHours.endTime, occupied);
      if (serviceDuration > 0) {
        // If any interval can fit the service duration, date is available
        const fits = freeIntervals.some(interval => this.getSlotDuration(interval) >= serviceDuration);
        if (fits) return true;
      } else {
        // No specific service duration; any free time means available
        if (freeIntervals.length > 0) return true;
      }
    }

    return false;
  }

  private deduplicateSlots(slots: Slot[]): Slot[] {
    // Remove duplicates based on time window only (start+end), ignore medic
    const seen = new Set<string>();
    const unique: Slot[] = [];
    for (const slot of slots) {
      const key = `${slot.start}-${slot.end}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // Ensure we only return start/end, dropping any extra fields
      unique.push({ start: slot.start, end: slot.end });
    }
    return unique.sort((a, b) => a.start.localeCompare(b.start));
  }

  private async autoAssignMedic(
    businessLocationId: string,
    date: string,
    time: string,
    duration: number
  ): Promise<string> {
    const day = new Date(date + 'T00:00:00Z');
    const weekday = this.getWeekdayKey(day);

    // Get all medics for this business location
    const medics = await this.resourceRepo
      .createQueryBuilder('resource')
      .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
      .andWhere('resource.resourceType = :type', { type: 'medic' })
      .getMany();

    // Filter medics available on this day
    const availableMedics = medics.filter(medic => 
      this.isMedicAvailableOnDay(medic, weekday)
    );

    if (availableMedics.length === 0) {
      throw new BadRequestException('No medics available on this day');
    }

    // Get existing appointments for this day
    const existingAppointments = await this.resourceRepo
      .createQueryBuilder('resource')
      .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
      .andWhere('resource.resourceType = :type', { type: 'appointment' })
      .andWhere('resource.startDate = :date', { date })
      .getMany();

    // Group appointments by medic
    const appointmentsByMedic = this.groupAppointmentsByMedic(existingAppointments);

    // Find the medic with the least appointments or the first available one
    let selectedMedic = availableMedics[0];
    let minAppointments = appointmentsByMedic[selectedMedic.resourceId]?.length || 0;

    for (const medic of availableMedics) {
      const medicAppointments = appointmentsByMedic[medic.resourceId] || [];
      
      // Check if this medic has any conflicts at the requested time
      const hasConflict = medicAppointments.some(appointment => {
        const appointmentTime = (appointment.data as any)?.time;
        const appointmentDuration = (appointment.data as any)?.service?.duration || 0;
        
        if (!appointmentTime) return false;
        
        const appointmentStart = this.timeToMinutes(appointmentTime);
        const appointmentEnd = appointmentStart + appointmentDuration;
        const requestedStart = this.timeToMinutes(time);
        const requestedEnd = requestedStart + duration;
        
        // Check for overlap
        return (requestedStart < appointmentEnd && requestedEnd > appointmentStart);
      });

      if (!hasConflict) {
        // If this medic has fewer appointments, select them
        if (medicAppointments.length < minAppointments) {
          selectedMedic = medic;
          minAppointments = medicAppointments.length;
        }
      }
    }

    this.logger.debug(`Auto-assigned medic ${selectedMedic.resourceId} for ${date} at ${time}`);
    return selectedMedic.resourceId;
  }

  private async sendAutomatedMessages(
    businessId: string,
    locationId: string,
    appointmentData: AppointmentData
  ): Promise<void> {
    try {
      // Check if any automation services are enabled
      const isAnyServiceEnabled = await this.externalApiConfigService.isAnyServiceEnabled(businessId, locationId);
      
      if (!isAnyServiceEnabled) {
        this.logger.debug(`No automation services enabled for business ${businessId}, location ${locationId}`);
        return;
      }

      // Check what services should send on booking
      const shouldSend = await this.externalApiConfigService.shouldSendOnBooking(businessId, locationId);
      
      if (!shouldSend.sms && !shouldSend.email) {
        this.logger.debug(`No services configured to send on booking for business ${businessId}, location ${locationId}`);
        return;
      }

      // Populate business and location info
      const enrichedAppointmentData = await this.enrichAppointmentData(businessId, locationId, appointmentData);

      // Send booking confirmation
      const success = await this.messageAutomationService.sendBookingConfirmation(
        businessId,
        enrichedAppointmentData,
        locationId
      );

      if (success) {
        this.logger.log(`Booking confirmation sent successfully for business ${businessId}, location ${locationId}`);
      } else {
        this.logger.warn(`Failed to send booking confirmation for business ${businessId}, location ${locationId}`);
      }

    } catch (error) {
      this.logger.error(`Failed to send automated messages: ${error.message}`);
      // Don't throw error to avoid affecting appointment creation
    }
  }

  private async enrichAppointmentData(
    businessId: string,
    locationId: string,
    appointmentData: AppointmentData
  ): Promise<AppointmentData> {
    try {
      // Get business info
      const businessInfo = await this.businessInfoService.getBusinessInfo(businessId);
      const locationInfo = await this.businessInfoService.getLocationInfo(businessId, locationId);

      return {
        ...appointmentData,
        businessName: businessInfo?.businessName || 'Business',
        locationName: locationInfo?.name || 'Location',
        phoneNumber: (businessInfo as any)?.phoneNumber || ''
      };
    } catch (error) {
      this.logger.error(`Failed to enrich appointment data: ${error.message}`);
      return appointmentData; // Return original data if enrichment fails
    }
  }

  private formatDate(date: string): string {
    const d = new Date(date + 'T00:00:00Z');
    return d.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Get appointments for a specific patient using patientId
   * Used for patient access code authentication
   */
  async getPatientAppointmentsByPatientId(
    businessLocationId: string,
    patientId: string,
    params: { from?: string; to?: string; status?: string; page?: number; limit?: number },
  ) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 50, 200);

    const qb = this.resourceRepo
      .createQueryBuilder('resource')
      .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
      .andWhere('resource.resourceType = :type', { type: 'appointment' })
      .andWhere("resource.data->'patient'->>'id' = :patientId", { patientId })
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

    const items = await qb.getMany();
    return { success: true, data: items.map(i => ({ id: i.resourceId, date: i.startDate, ...i.data })) };
  }

  /**
   * Cancel appointment by patient using patientId
   * Used for patient access code authentication
   */
  async cancelAppointmentByPatient(
    businessId: string,
    locationId: string,
    appointmentId: string,
    patientId: string,
  ) {
    const businessLocationId = `${businessId}-${locationId}`;

    // Read existing appointment to verify it belongs to this patient
    const existing = await this.resourceRepo
      .createQueryBuilder('resource')
      .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
      .andWhere('resource.resourceType = :type', { type: 'appointment' })
      .andWhere('resource.resourceId = :id', { id: appointmentId })
      .andWhere("resource.data->'patient'->>'id' = :patientId", { patientId })
      .getOne();

    if (!existing) {
      throw new BadRequestException('Appointment not found or does not belong to this patient');
    }

    const currentStatus = (existing.data as any)?.status || 'scheduled';

    if (currentStatus !== 'scheduled') {
      throw new BadRequestException('Only appointments with status "scheduled" can be canceled');
    }

    // Send cancel operation to Kinesis
    const operation = {
      operation: 'update',
      businessId,
      locationId,
      resourceType: 'appointment',
      resourceId: appointmentId,
      data: {
        ...existing.data,
        status: 'canceled',
        canceledAt: new Date().toISOString(),
        canceledBy: {
          userId: patientId,
          type: 'patient'
        }
      },
      timestamp: new Date().toISOString(),
      requestId: Date.now().toString(),
    } as any;

    await this.kinesisService.sendResourceOperation(operation);
    return { success: true, message: 'Appointment canceled successfully', requestId: operation.requestId };
  }

  /**
   * Verify rating token and return appointment details
   */
  async verifyRatingToken(businessId: string, locationId: string, token: string) {
    const businessLocationId = `${businessId}-${locationId}`;

    try {
      // Find rating resource by token
      const ratingResource = await this.resourceRepo
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
        .andWhere('resource.resourceType = :type', { type: 'rating' })
        .andWhere("resource.data->>'token' = :token", { token })
        .getOne();

      if (!ratingResource) {
        throw new BadRequestException('Invalid rating token');
      }

      const ratingData = ratingResource.data as any;

      // Check if token is already used
      if (ratingData.tokenUsed) {
        throw new BadRequestException('This rating link has already been used');
      }

      // Check if token is expired
      const expiresAt = new Date(ratingData.tokenExpiresAt);
      if (expiresAt < new Date()) {
        throw new BadRequestException('This rating link has expired');
      }

      // Return appointment and patient details for display
      return {
        success: true,
        data: {
          appointmentId: ratingData.appointmentId,
          patientName: ratingData.patientName,
          appointmentDate: ratingData.appointmentDate,
          appointmentTime: ratingData.appointmentTime,
          locationName: ratingData.locationName || '',
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to verify rating token: ${error.message}`, error.stack);
      throw new BadRequestException('Invalid or expired rating token');
    }
  }

  /**
   * Submit rating for a completed appointment
   */
  async submitRating(
    businessId: string,
    locationId: string,
    token: string,
    ratingData: {
      score: number;
      comment?: string;
      categories?: {
        service?: number;
        cleanliness?: number;
        staff?: number;
        waitTime?: number;
      };
    },
  ) {
    const businessLocationId = `${businessId}-${locationId}`;

    // Validate score
    if (ratingData.score < 1 || ratingData.score > 5) {
      throw new BadRequestException('Score must be between 1 and 5');
    }

    // Validate categories if provided
    if (ratingData.categories) {
      const categories = Object.values(ratingData.categories);
      for (const cat of categories) {
        if (cat !== undefined && (cat < 1 || cat > 5)) {
          throw new BadRequestException('Category scores must be between 1 and 5');
        }
      }
    }

    try {
      // Find and verify the rating resource with token
      const ratingResource = await this.resourceRepo
        .createQueryBuilder('resource')
        .where('resource.businessLocationId = :businessLocationId', { businessLocationId })
        .andWhere('resource.resourceType = :type', { type: 'rating' })
        .andWhere("resource.data->>'token' = :token", { token })
        .getOne();

      if (!ratingResource) {
        throw new BadRequestException('Invalid rating token');
      }

      const existingRatingData = ratingResource.data as any;

      // Check if token is already used
      if (existingRatingData.tokenUsed) {
        throw new BadRequestException('This rating link has already been used');
      }

      // Check if token is expired
      const expiresAt = new Date(existingRatingData.tokenExpiresAt);
      if (expiresAt < new Date()) {
        throw new BadRequestException('This rating link has expired');
      }

      // Update the rating resource with the submitted rating
      const updatedRatingData = {
        ...existingRatingData,
        score: ratingData.score,
        comment: ratingData.comment,
        categories: ratingData.categories,
        tokenUsed: true,
        submittedAt: new Date().toISOString(),
      };

      // Send update operation to Kinesis to mark token as used and save rating
      const operation = {
        operation: 'update',
        businessId,
        locationId,
        resourceType: 'rating',
        resourceId: ratingResource.resourceId,
        data: updatedRatingData,
        timestamp: new Date().toISOString(),
        requestId: Date.now().toString(),
      } as any;

      await this.kinesisService.sendResourceOperation(operation);

      this.logger.log(`Rating submitted successfully for appointment ${existingRatingData.appointmentId}`);

      return {
        success: true,
        message: 'Thank you for your feedback!',
        requestId: operation.requestId,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to submit rating: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to submit rating');
    }
  }
}


