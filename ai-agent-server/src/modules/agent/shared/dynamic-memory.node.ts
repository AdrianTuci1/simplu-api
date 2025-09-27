import { AgentState } from '../interfaces/agent.interface';
import { RagService } from '../../rag/rag.service';

export class DynamicMemoryNode {
  constructor(private ragService: RagService) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const businessId = state.businessId || state.businessInfo?.businessId || 'unknown';
      const businessType = state.businessInfo?.businessType || 'general';
      const userId = state.userId || 'unknown';
      const platform = state.clientSource || 'unknown';
      
      // Load business memory for general context
      const businessMemory = await this.ragService.getDynamicBusinessMemory(businessId, businessType, 'general');
      
      // Load user memory for current platform
      const userMemory = await this.ragService.getDynamicUserMemory(businessId, userId, platform);
      
      // Also load user memory across all platforms for comprehensive context
      const userMemoryAllPlatforms = await this.ragService.getDynamicUserMemoryAllPlatforms(businessId, userId);

      return {
        dynamicBusinessMemory: businessMemory || {},
        dynamicUserMemory: {
          current: userMemory || {},
          allPlatforms: userMemoryAllPlatforms || []
        }
      };
    } catch (error) {
      console.error('DynamicMemoryNode: error loading dynamic memory', error);
      return { dynamicBusinessMemory: {}, dynamicUserMemory: { current: {}, allPlatforms: [] } };
    }
  }
}
