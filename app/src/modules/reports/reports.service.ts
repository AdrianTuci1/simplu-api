import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportType, ReportFormat, ReportStatus } from './entities/report.entity';

interface GenerateReportDto {
  name: string;
  description: string;
  type: string;
  format: string;
  parameters?: Record<string, any>;
}

interface GetReportsParams {
  tenantId: string;
  locationId: string;
  page: number;
  limit: number;
  type?: string;
  status?: string;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
  ) {}

  async getReports(params: GetReportsParams) {
    const { tenantId, locationId, page, limit, type, status } = params;
    const skip = (page - 1) * limit;

    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.user', 'user')
      .where('report.tenant.id = :tenantId', { tenantId });

    if (locationId) {
      queryBuilder.andWhere('report.locationId = :locationId', { locationId });
    }

    if (type) {
      queryBuilder.andWhere('report.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('report.status = :status', { status });
    }

    const [reports, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('report.createdAt', 'DESC')
      .getManyAndCount();

    return {
      reports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async generateReport(generateReportDto: GenerateReportDto, tenantId: string, userId: string, locationId: string) {
    const report = this.reportRepository.create({
      name: generateReportDto.name,
      description: generateReportDto.description,
      type: generateReportDto.type as ReportType,
      format: generateReportDto.format as ReportFormat,
      status: ReportStatus.PENDING,
      parameters: generateReportDto.parameters,
      tenant: Promise.resolve({ id: tenantId } as any),
      user: Promise.resolve({ id: userId } as any),
      locationId,
    });

    const savedReport = await this.reportRepository.save(report) as unknown as Report;

    // Simulate report generation process
    setTimeout(async () => {
      await this.processReport(savedReport.id);
    }, 1000);

    return savedReport;
  }

  async getReport(id: string, tenantId: string, locationId: string) {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: ['user', 'tenant'],
    });

    if (!report) {
      return null;
    }

    const tenant = await report.tenant;
    if (tenant.id !== tenantId) {
      return null;
    }

    if (locationId && report.locationId !== locationId) {
      return null;
    }

    return report;
  }

  private async processReport(reportId: string) {
    const report = await this.reportRepository.findOne({ where: { id: reportId } });
    if (!report) return;

    try {
      // Update status to generating
      report.status = ReportStatus.GENERATING;
      await this.reportRepository.save(report);

      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update with completed status and mock data
      report.status = ReportStatus.COMPLETED;
      report.filePath = `/reports/${reportId}.${report.format}`;
      report.fileSize = 1024 * 1024; // 1MB
      report.downloadUrl = `/api/reports/${reportId}/download`;
      report.generatedAt = new Date();
      await this.reportRepository.save(report);
    } catch (error) {
      report.status = ReportStatus.FAILED;
      report.errorMessage = error.message;
      await this.reportRepository.save(report);
    }
  }

  async getAvailableReportTypes() {
    return [
      {
        type: ReportType.INVOICE_SUMMARY,
        name: 'Invoice Summary',
        description: 'Summary of invoices for a specific period',
        formats: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.CSV],
      },
      {
        type: ReportType.APPOINTMENT_SUMMARY,
        name: 'Appointment Summary',
        description: 'Summary of appointments and bookings',
        formats: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.CSV],
      },
      {
        type: ReportType.CLIENT_SUMMARY,
        name: 'Client Summary',
        description: 'Summary of client information and activities',
        formats: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.CSV],
      },
      {
        type: ReportType.EMPLOYEE_SUMMARY,
        name: 'Employee Summary',
        description: 'Summary of employee performance and activities',
        formats: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.CSV],
      },
      {
        type: ReportType.STOCK_SUMMARY,
        name: 'Stock Summary',
        description: 'Summary of stock levels and movements',
        formats: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.CSV],
      },
      {
        type: ReportType.FINANCIAL_SUMMARY,
        name: 'Financial Summary',
        description: 'Financial summary and analytics',
        formats: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.CSV],
      },
    ];
  }
} 