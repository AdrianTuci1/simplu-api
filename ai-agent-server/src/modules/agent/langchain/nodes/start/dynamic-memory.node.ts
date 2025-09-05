import { AgentState } from '../../../interfaces/agent.interface';
import { RagService } from '../../../../rag/rag.service';

export class DynamicMemoryNode {
  constructor(private ragService: RagService) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const businessKey = state.businessId || state.businessInfo?.businessId || state.businessInfo?.businessType || 'general';
      const userKey = state.userId || 'unknown';
      const [businessMemory, userMemory] = await Promise.all([
        this.ragService.getDynamicBusinessMemory(businessKey),
        this.ragService.getDynamicUserMemory(businessKey, userKey)
      ]);

      return {
        dynamicBusinessMemory: businessMemory || {},
        dynamicUserMemory: userMemory || {}
      };
    } catch (error) {
      console.error('DynamicMemoryNode: error loading dynamic memory', error);
      return { dynamicBusinessMemory: {}, dynamicUserMemory: {} };
    }
  }
}


