import { AgentState } from '../../interfaces/agent.interface';
import { RagService } from '../../../rag/rag.service';

export class DynamicMemoryNode {
  constructor(private ragService: RagService) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const [businessMemory, userMemory] = await Promise.all([
        this.ragService.getDynamicBusinessMemory(state.businessId),
        this.ragService.getDynamicUserMemory(state.businessId, state.userId)
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

