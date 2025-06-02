import { Injectable } from '@nestjs/common';
import { AgentService } from '../agent/agent.service';
import { PolicyService, Action, Resource } from '../policy/policy.service';

@Injectable()
export class RoutesService {
  constructor(
    private readonly agentService: AgentService,
    private readonly policyService: PolicyService,
  ) {}

  async processRequest(tenantId: string, message: string) {
    // Check if the tenant has permission to use the agent
    if (!this.policyService.can(tenantId, Action.READ, Resource.CONVERSATIONS)) {
      throw new Error('Unauthorized: Tenant does not have permission to use the agent');
    }

    // Process the message through the agent
    return this.agentService.processMessage(message, tenantId);
  }
} 