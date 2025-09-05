import { AgentState } from '../../../interfaces/agent.interface';
import { RagService } from '../../../../rag/rag.service';

export class InternalLoopNode {
  constructor(private ragService: RagService) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      await this.ragService.putDynamicBusinessMemory(state.businessId, {
        lastResponse: state.response,
        lastUpdatedAt: new Date().toISOString()
      });
      return { actions: [...(state.actions || []), { type: 'internal_loop', status: 'success', details: { rag: 'updated' } }] } as any;
    } catch (_err) {
      return { actions: [...(state.actions || []), { type: 'internal_loop', status: 'failed', details: {} }] } as any;
    }
  }
}


