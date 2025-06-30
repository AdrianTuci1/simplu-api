import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum WorkflowStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
}

export enum WorkflowType {
  INVOICE_APPROVAL = 'invoice_approval',
  APPOINTMENT_CONFIRMATION = 'appointment_confirmation',
  CLIENT_ONBOARDING = 'client_onboarding',
  EMPLOYEE_ONBOARDING = 'employee_onboarding',
  STOCK_ALERT = 'stock_alert',
  CUSTOM = 'custom',
}

@Entity('workflows')
export class Workflow {
  @ApiProperty({ description: 'The unique identifier of the workflow' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'The name of the workflow' })
  @Column()
  name: string;

  @ApiProperty({ description: 'The description of the workflow' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ description: 'The type of workflow', enum: WorkflowType })
  @Column({
    type: 'enum',
    enum: WorkflowType,
  })
  type: WorkflowType;

  @ApiProperty({ description: 'The status of the workflow', enum: WorkflowStatus })
  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.DRAFT,
  })
  status: WorkflowStatus;

  @ApiProperty({ description: 'The steps in this workflow' })
  @OneToMany(() => WorkflowStep, step => step.workflow, { cascade: true })
  steps: WorkflowStep[];

  @ApiProperty({ description: 'The tenant this workflow belongs to', type: () => Tenant })
  @ManyToOne(() => Tenant, tenant => tenant.workflows)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Promise<Tenant>;

  @ApiProperty({ description: 'The location ID' })
  @Column({ nullable: true })
  locationId: string;

  @ApiProperty({ description: 'Additional configuration for the workflow' })
  @Column('jsonb', { nullable: true })
  configuration: Record<string, any>;

  @ApiProperty({ description: 'The creation date of the workflow' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the workflow' })
  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('workflow_steps')
export class WorkflowStep {
  @ApiProperty({ description: 'The unique identifier of the workflow step' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'The name of the step' })
  @Column()
  name: string;

  @ApiProperty({ description: 'The description of the step' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ description: 'The order of the step in the workflow' })
  @Column('int')
  order: number;

  @ApiProperty({ description: 'The type of action for this step' })
  @Column()
  actionType: string;

  @ApiProperty({ description: 'The configuration for this step' })
  @Column('jsonb', { nullable: true })
  configuration: Record<string, any>;

  @ApiProperty({ description: 'Whether this step is required' })
  @Column({ default: true })
  required: boolean;

  @ApiProperty({ description: 'The workflow this step belongs to', type: () => Workflow })
  @ManyToOne(() => Workflow, workflow => workflow.steps)
  @JoinColumn({ name: 'workflow_id' })
  workflow: Workflow;

  @ApiProperty({ description: 'The creation date of the workflow step' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'The last update date of the workflow step' })
  @UpdateDateColumn()
  updatedAt: Date;
} 