import { AgentState } from '../../../interfaces/agent.interface';
import { RagService } from '../../../../rag/rag.service';

export class InternalLoopNode {
  constructor(private ragService: RagService) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      await this.ragService.putDynamicBusinessMemory(state.businessId, state.businessInfo?.businessType || 'general', 'general', {
        lastResponse: state.response,
        lastUpdatedAt: new Date().toISOString()
      });
      // CRITICAL FIX: Don't create new array, push to existing one
      if (!state.actions) state.actions = [];
      state.actions.push({ type: 'internal_loop', status: 'success', details: { rag: 'updated' } });
      return {};
    } catch (_err) {
      // CRITICAL FIX: Don't create new array, push to existing one
      if (!state.actions) state.actions = [];
      state.actions.push({ type: 'internal_loop', status: 'failed', details: {} });
      return {};
    }
  }
}


