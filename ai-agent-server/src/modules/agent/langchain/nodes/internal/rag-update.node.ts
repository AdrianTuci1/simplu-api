import { AgentState } from '../../../interfaces/agent.interface';
import { RagService } from '../../../../rag/rag.service';

export class RagUpdateNode {
  constructor(private ragService: RagService) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const businessId = state.businessId || 'unknown';
      const businessType = state.businessInfo?.businessType || 'general';
      const userId = state.userId || 'unknown';
      const platform = state.clientSource || 'unknown';
      
      // Determine action based on current context
      const action = state.userFoundInResourceType || 'general';
      
      const updates: Promise<any>[] = [];
      
      // Update business memory with current context
      updates.push(this.ragService.putDynamicBusinessMemory(businessId, businessType, action, {
        lastMessage: state.message,
        lastUpdatedAt: new Date().toISOString(),
        businessType: state.businessInfo?.businessType,
        ragSummary: (state.ragResults || []).map(r => r.instruction),
        discoveredResourceTypes: state.discoveredResourceTypes || [],
        discoveredSchemas: state.discoveredSchemas || {},
        response: state.response,
        actions: state.actions
      }));
      
      // Update user memory with current interaction
      updates.push(this.ragService.putDynamicUserMemory(businessId, userId, platform, {
        role: state.role || 'client_existent',
        lastInteractionAt: new Date().toISOString(),
        context: { businessId, locationId: state.locationId },
        message: state.message,
        response: state.response,
        businessType: state.businessInfo?.businessType,
        platform,
        discoveredResourceTypes: state.discoveredResourceTypes || []
      }));
      
      await Promise.all(updates);
      return {};
    } catch (error) {
      console.error('RagUpdateNode: error updating dynamic RAG memory', error);
      return {};
    }
  }
}


