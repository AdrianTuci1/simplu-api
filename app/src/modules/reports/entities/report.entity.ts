import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../auth/entities/user.entity';

export enum ReportStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ReportType {
  INVOICE_SUMMARY = 'invoice_summary',
  APPOINTMENT_SUMMARY = 'appointment_summary',
  CLIENT_SUMMARY = 'client_summary',
  EMPLOYEE_SUMMARY = 'employee_summary',
  STOCK_SUMMARY = 'stock_summary',
  FINANCIAL_SUMMARY = 'financial_summary',
  CUSTOM = 'custom',
}

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
}

@Entity('reports')
export class Report {
  @ApiProperty({ description: 'The unique identifier of the report' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'The name of the report' })
  @Column()
  name: string;

  @ApiProperty({ description: 'The description of the report' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ description: 'The type of report', enum: ReportType })
  @Column({
    type: 'enum',
    enum: ReportType,
  })
  type: ReportType;

  @ApiProperty({ description: 'The format of the report', enum: ReportFormat })
  @Column({
    type: 'enum',
    enum: ReportFormat,
    default: ReportFormat.PDF,
  })
  format: ReportFormat;

  @ApiProperty({ description: 'The status of the report', enum: ReportStatus })
  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @ApiProperty({ description: 'The parameters used to generate the report' })
  @Column('jsonb', { nullable: true })
  parameters: Record<string, any>;

  @ApiProperty({ description: 'The file path where the report is stored' })
  @Column({ nullable: true })
  filePath: string;

  @ApiProperty({ description: 'The file size in bytes' })
  @Column('bigint', { nullable: true })
  fileSize: number;

  @ApiProperty({ description: 'The URL to download the report' })
  @Column({ nullable: true })
  downloadUrl: string;

  @ApiProperty({ description: 'Error message if report generation failed' })
  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @ApiProperty({ description: 'The tenant this report belongs to', type: () => Tenant })
  @ManyToOne(() => Tenant, tenant => tenant.reports)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Promise<Tenant>;

  @ApiProperty({ description: 'The user who requested the report', type: () => User })
  @ManyToOne(() => User, user => user.reports, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: Promise<User>;

  @ApiProperty({ description: 'The location ID' })
  @Column({ nullable: true })
  locationId: string;

  @ApiProperty({ description: 'The date when the report was generated' })
  @Column({ nullable: true })
  generatedAt: Date;

  @ApiProperty({ description: 'The creation date of the report' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the report' })
  @UpdateDateColumn()
  updatedAt: Date;
} 