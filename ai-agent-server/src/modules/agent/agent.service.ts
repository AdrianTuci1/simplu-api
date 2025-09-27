import { Injectable } from '@nestjs/common';
import { 
  WebhookData, 
  AutonomousActionResult
} from './interfaces/agent.interface';
import { MessageDto, AgentResponse } from '@/shared/interfaces/message.interface';
import { OperatorAgentService } from './operator/operator-agent.service';
import { CustomerAgentService } from './customer/customer-agent.service';

@Injectable()
export class AgentService {
  constructor(
    private readonly operatorAgentService: OperatorAgentService,
    private readonly customerAgentService: CustomerAgentService
  ) {
    console.log('🚀 Agent Service starting - routing to specialized agents');
  }

  // Process messages from WebSocket (operators)
  async processMessage(data: MessageDto): Promise<AgentResponse> {
    // Route to operator agent for WebSocket messages
    return await this.operatorAgentService.processMessage(data);
  }

  // Autonomous processing for webhooks (customers)
  async processWebhookMessage(webhookData: WebhookData): Promise<AutonomousActionResult> {
    // Route to customer agent for webhook messages
    return await this.customerAgentService.processWebhookMessage(webhookData);
  }

  // Process webhook through main pipeline (for testing or special cases)
  async processWebhookThroughPipeline(webhookData: WebhookData): Promise<AgentResponse> {
    // Route to customer agent for webhook pipeline processing
    return await this.customerAgentService.processWebhookThroughPipeline(webhookData);
  }
}