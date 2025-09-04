import { AgentState } from '../../interfaces/agent.interface';
import { RagService } from '../../../rag/rag.service';

export class RagUpdateNode {
  constructor(private ragService: RagService) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const updates: Promise<any>[] = [];
      // Update business-level memory with last message and RAG results summary
      updates.push(this.ragService.putDynamicBusinessMemory(state.businessId, {
        lastMessage: state.message,
        lastUpdatedAt: new Date().toISOString(),
        businessType: state.businessInfo?.businessType,
        ragSummary: (state.ragResults || []).map(r => r.instruction),
        discoveredResourceTypes: state.discoveredResourceTypes || [],
        discoveredSchemas: state.discoveredSchemas || {}
      }));

      // Update user-level memory with inferred role and last intent guess from ragResults
      updates.push(this.ragService.putDynamicUserMemory(state.businessId, state.userId, {
        role: state.role || 'client_existent',
        lastInteractionAt: new Date().toISOString(),
        context: {
          businessId: state.businessId,
          locationId: state.locationId
        }
      }));

      await Promise.all(updates);
      return {};
    } catch (error) {
      console.error('RagUpdateNode: error updating dynamic RAG memory', error);
      return {};
    }
  }
}

