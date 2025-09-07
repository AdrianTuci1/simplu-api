import { AgentState } from '../../../interfaces/agent.interface';
import { RagService } from '../../../../rag/rag.service';

export class IdentificationNode {
  constructor(

    private ragService: RagService,
  ) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      console.log(`[IdentificationNode] Processing source: ${state.source}, businessId: ${state.businessId}, userId: ${state.userId}`);
      
      // If request comes from operator (websocket coordinator), we already have context
      if (state.source === 'websocket') {
        console.log(`[IdentificationNode] Routing websocket to INTERNAL flow`);
        return { role: 'operator', needsIntrospection: true, startRoute: 'internal' } as any;
      }

      // If request comes from webhook (external user), set role as webhook and attach any known dynamic memory
      if (state.source === 'webhook') {
        console.log(`[IdentificationNode] Routing webhook to EXTERNAL flow`);
        const businessId = state.businessId || 'unknown';
        const userId = state.userId || 'unknown';
        const platform = 'webhook'; // Default for webhook source
        
        // Try to get user memory from webhook platform first, then fallback to all platforms
        let userMem = await this.ragService.getDynamicUserMemory(businessId, userId, platform);
        if (!userMem) {
          const allPlatforms = await this.ragService.getDynamicUserMemoryAllPlatforms(businessId, userId);
          userMem = allPlatforms.length > 0 ? allPlatforms[0] : null;
        }
        
        const clientSource = 'unknown';
        return { 
          role: 'webhook', 
          dynamicUserMemory: { current: userMem || {}, allPlatforms: [] }, 
          startRoute: 'external', 
          clientSource 
        } as any;
      }
      // Default for remaining sources (e.g., cron)
      console.log(`[IdentificationNode] Unknown source '${state.source}', defaulting to EXTERNAL flow`);
      return { role: 'client_nou', needsIntrospection: false, startRoute: 'external' } as any;
    } catch (error) {
      console.warn('IdentificationNode: error inferring role, defaulting to client_existent', error);
      console.log(`[IdentificationNode] Error case, defaulting to EXTERNAL flow`);
      return { role: 'client_existent', needsIntrospection: false, startRoute: 'external' } as any;
    }
  }
}


