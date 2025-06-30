import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import { Invoice, InvoiceItem, InvoiceStatus } from './entities/invoice.entity';

interface CreateInvoiceItemDto {
  serviceId: string;
  quantity: number;
  price: number;
  description: string;
}

interface CreateInvoiceDto {
  clientId: string;
  items: CreateInvoiceItemDto[];
  totalAmount: number;
  dueDate: string;
  notes?: string;
}

interface UpdateInvoiceDto {
  status?: string;
  totalAmount?: number;
  dueDate?: string;
  notes?: string;
}

export interface GetInvoicesParams {
  tenantId: string;
  locationId: string;
  date: string;
  status?: string;
  clientId?: string;
}

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly invoiceItemRepository: Repository<InvoiceItem>,
  ) {}

  async getInvoices(params: GetInvoicesParams) {
    const { tenantId, locationId, date, status, clientId } = params;

    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.client', 'client')
      .where('invoice.tenant.id = :tenantId', { tenantId })
      .andWhere('DATE(invoice.createdAt) = :date', { date });

    if (locationId) {
      queryBuilder.andWhere('invoice.locationId = :locationId', { locationId });
    }

    if (status) {
      queryBuilder.andWhere('invoice.status = :status', { status });
    }

    if (clientId) {
      queryBuilder.andWhere('invoice.client.id = :clientId', { clientId });
    }

    const invoices = await queryBuilder
      .orderBy('invoice.createdAt', 'DESC')
      .getMany();

    return {
      invoices,
      total: invoices.length,
      date,
      filters: { status, clientId },
      tenantId,
      locationId,
    };
  }

  async createInvoice(createInvoiceDto: CreateInvoiceDto, tenantId: string, locationId: string) {
    const invoice = this.invoiceRepository.create({
      invoiceNumber: await this.generateInvoiceNumber(),
      status: InvoiceStatus.DRAFT,
      totalAmount: createInvoiceDto.totalAmount,
      dueDate: new Date(createInvoiceDto.dueDate),
      notes: createInvoiceDto.notes,
      tenant: Promise.resolve({ id: tenantId } as any),
      client: Promise.resolve({ id: createInvoiceDto.clientId } as any),
      locationId,
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);

    // Create invoice items
    const invoiceItems = createInvoiceDto.items.map(item =>
      this.invoiceItemRepository.create({
        serviceId: item.serviceId,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.quantity * item.price,
        description: item.description,
        invoice: savedInvoice,
      })
    );

    await this.invoiceItemRepository.save(invoiceItems);

    return this.getInvoice(savedInvoice.id, tenantId, locationId);
  }

  async getInvoice(id: string, tenantId: string, locationId: string) {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['client', 'items', 'tenant'],
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const tenant = await invoice.tenant;
    if (tenant.id !== tenantId) {
      throw new NotFoundException('Invoice not found');
    }

    if (locationId && invoice.locationId !== locationId) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async updateInvoice(id: string, updateInvoiceDto: UpdateInvoiceDto, tenantId: string, locationId: string) {
    const invoice = await this.getInvoice(id, tenantId, locationId);

    if (updateInvoiceDto.status) {
      invoice.status = updateInvoiceDto.status as InvoiceStatus;
    }
    if (updateInvoiceDto.totalAmount) {
      invoice.totalAmount = updateInvoiceDto.totalAmount;
    }
    if (updateInvoiceDto.dueDate) {
      invoice.dueDate = new Date(updateInvoiceDto.dueDate);
    }
    if (updateInvoiceDto.notes !== undefined) {
      invoice.notes = updateInvoiceDto.notes;
    }

    return this.invoiceRepository.save(invoice);
  }

  async deleteInvoice(id: string, tenantId: string, locationId: string) {
    const invoice = await this.getInvoice(id, tenantId, locationId);
    await this.invoiceRepository.remove(invoice);
    return { message: 'Invoice deleted successfully' };
  }

  private async generateInvoiceNumber(): Promise<string> {
    const count = await this.invoiceRepository.count();
    const year = new Date().getFullYear();
    return `INV-${year}-${(count + 1).toString().padStart(6, '0')}`;
  }
} 