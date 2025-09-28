import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { AgentService } from '../agent/agent.service';
import { MessageDto, AgentResponse } from '@/shared/interfaces/message.interface';

@Injectable()
export class WebSocketAgentService {
  constructor(
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: AgentService
  ) {}

  async processMessage(data: MessageDto): Promise<AgentResponse> {
    return await this.agentService.processMessage(data);
  }
}
