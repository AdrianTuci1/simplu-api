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
      
      // Update user memory with current interaction and session context
      const userMemoryUpdate = {
        role: state.role || 'client_existent',
        lastInteractionAt: new Date().toISOString(),
        context: { businessId, locationId: state.locationId },
        message: state.message,
        response: state.response,
        businessType: state.businessInfo?.businessType,
        platform,
        discoveredResourceTypes: state.discoveredResourceTypes || [],
        // Include session context for better user understanding
        sessionContext: {
          conversationLength: state.sessionMessages?.length || 0,
          recentTopics: state.sessionMessages?.slice(-3).map(msg => msg.content).join(' | ') || '',
          lastUserMessage: state.sessionMessages?.find(msg => msg.type === 'user')?.content || '',
          interactionHistory: state.sessionMessages?.map(msg => ({
            type: msg.type,
            content: msg.content.substring(0, 100), // Truncate for memory efficiency
            timestamp: msg.timestamp
          })) || []
        }
      };
      
      updates.push(this.ragService.putDynamicUserMemory(businessId, userId, platform, userMemoryUpdate));
      
      await Promise.all(updates);
      return {};
    } catch (error) {
      console.error('RagUpdateNode: error updating dynamic RAG memory', error);
      return {};
    }
  }
}


