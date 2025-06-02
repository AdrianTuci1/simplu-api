import { Injectable, Logger } from '@nestjs/common';
import { AgentService } from '../agent/agent.service';
import { PolicyService, Action, Resource } from '../policy/policy.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RoutesService {
  private readonly logger = new Logger(RoutesService.name);

  constructor(
    private readonly agentService: AgentService,
    private readonly policyService: PolicyService,
  ) {}

  async processRequest(tenantId: string, userId: string, message: string, context?: any) {
    try {
      // Check if the tenant has permission to use the agent
      const canRead = await this.policyService.can(tenantId, Action.READ, Resource.CONVERSATIONS);
      if (!canRead) {
        throw new Error('Unauthorized: Tenant does not have permission to use the agent');
      }

      const sessionId = uuidv4(); // Generate a new session ID for each request
      
      // Process the message through the agent
      return this.agentService.processMessage(
        tenantId,
        userId,
        sessionId,
        message,
        context
      );
    } catch (error) {
      this.logger.error(`Error processing request: ${error.message}`, error.stack);
      throw error;
    }
  }

  async processMessage(tenantId: string, userId: string, message: string, context?: any) {
    try {
      const sessionId = uuidv4(); // Generate a new session ID for each request
      
      return this.agentService.processMessage(
        tenantId,
        userId,
        sessionId,
        message,
        context
      );
    } catch (error) {
      this.logger.error(`Error processing message: ${error.message}`, error.stack);
      throw error;
    }
  }
} 