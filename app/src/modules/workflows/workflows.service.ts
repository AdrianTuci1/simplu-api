import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow, WorkflowStep, WorkflowType, WorkflowStatus } from './entities/workflow.entity';

interface GetWorkflowsParams {
  tenantId: string;
  locationId: string;
  page: number;
  limit: number;
  type?: string;
  status?: string;
}

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>,
    @InjectRepository(WorkflowStep)
    private readonly workflowStepRepository: Repository<WorkflowStep>,
  ) {}

  async getWorkflows(params: GetWorkflowsParams) {
    const { tenantId, locationId, page, limit, type, status } = params;
    const skip = (page - 1) * limit;

    const queryBuilder = this.workflowRepository
      .createQueryBuilder('workflow')
      .leftJoinAndSelect('workflow.steps', 'steps')
      .where('workflow.tenant.id = :tenantId', { tenantId });

    if (locationId) {
      queryBuilder.andWhere('workflow.locationId = :locationId', { locationId });
    }

    if (type) {
      queryBuilder.andWhere('workflow.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('workflow.status = :status', { status });
    }

    const [workflows, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('workflow.createdAt', 'DESC')
      .getManyAndCount();

    return {
      workflows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getWorkflow(id: string, tenantId: string, locationId: string) {
    const workflow = await this.workflowRepository.findOne({
      where: { id },
      relations: ['steps', 'tenant'],
    });

    if (!workflow) {
      return null;
    }

    const tenant = await workflow.tenant;
    if (tenant.id !== tenantId) {
      return null;
    }

    if (locationId && workflow.locationId !== locationId) {
      return null;
    }

    return workflow;
  }

  async getDefaultWorkflows(tenantId: string, locationId: string) {
    const defaultWorkflows = [
      {
        name: 'Invoice Approval',
        description: 'Standard workflow for invoice approval process',
        type: WorkflowType.INVOICE_APPROVAL,
        status: WorkflowStatus.ACTIVE,
        steps: [
          {
            name: 'Create Invoice',
            description: 'Create a new invoice',
            order: 1,
            actionType: 'create_invoice',
            required: true,
          },
          {
            name: 'Review Invoice',
            description: 'Review the invoice details',
            order: 2,
            actionType: 'review_invoice',
            required: true,
          },
          {
            name: 'Approve Invoice',
            description: 'Approve the invoice for payment',
            order: 3,
            actionType: 'approve_invoice',
            required: true,
          },
        ],
      },
      {
        name: 'Appointment Confirmation',
        description: 'Workflow for confirming appointments',
        type: WorkflowType.APPOINTMENT_CONFIRMATION,
        status: WorkflowStatus.ACTIVE,
        steps: [
          {
            name: 'Schedule Appointment',
            description: 'Schedule a new appointment',
            order: 1,
            actionType: 'schedule_appointment',
            required: true,
          },
          {
            name: 'Send Confirmation',
            description: 'Send confirmation to client',
            order: 2,
            actionType: 'send_confirmation',
            required: true,
          },
          {
            name: 'Client Confirmation',
            description: 'Wait for client confirmation',
            order: 3,
            actionType: 'client_confirmation',
            required: false,
          },
        ],
      },
      {
        name: 'Client Onboarding',
        description: 'Workflow for onboarding new clients',
        type: WorkflowType.CLIENT_ONBOARDING,
        status: WorkflowStatus.ACTIVE,
        steps: [
          {
            name: 'Create Client Profile',
            description: 'Create a new client profile',
            order: 1,
            actionType: 'create_client',
            required: true,
          },
          {
            name: 'Collect Information',
            description: 'Collect required client information',
            order: 2,
            actionType: 'collect_info',
            required: true,
          },
          {
            name: 'Welcome Email',
            description: 'Send welcome email to client',
            order: 3,
            actionType: 'send_welcome',
            required: true,
          },
        ],
      },
    ];

    return {
      workflows: defaultWorkflows,
      total: defaultWorkflows.length,
      tenantId,
      locationId,
    };
  }
} 