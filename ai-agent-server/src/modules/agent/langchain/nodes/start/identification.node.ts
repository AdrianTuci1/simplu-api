import { ChatOpenAI } from '@langchain/openai';
import { AgentState } from '../../../interfaces/agent.interface';
import { ResourcesService } from '../../../../resources/resources.service';
import { RagService } from '../../../../rag/rag.service';

export class IdentificationNode {
  constructor(
    private openaiModel: ChatOpenAI,
    private resourcesService: ResourcesService,
    private ragService: RagService,
  ) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      // If request comes from operator (websocket coordinator), we already have context
      if (state.source === 'websocket') {
        return { role: 'operator', needsIntrospection: true, startRoute: 'internal' } as any;
      }

      // If request comes from webhook (external user), set role as webhook and attach any known dynamic memory
      if (state.source === 'webhook') {
        const userMem = await this.ragService.getDynamicUserMemory(state.businessId, state.userId);
        const clientSource = 'unknown';
        return { role: 'webhook', dynamicUserMemory: userMem || null, startRoute: 'external', clientSource } as any;
      }
      // Default for remaining sources (e.g., cron)
      return { role: 'client_nou', needsIntrospection: false, startRoute: 'external' } as any;
    } catch (error) {
      console.warn('IdentificationNode: error inferring role, defaulting to client_existent', error);
      return { role: 'client_existent', needsIntrospection: false, startRoute: 'external' } as any;
    }
  }
}


