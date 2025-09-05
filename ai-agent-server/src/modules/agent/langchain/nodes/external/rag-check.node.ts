import { AgentState } from '../../../interfaces/agent.interface';

export class RagCheckNode {
  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    const hasRag = (state.ragResults?.length || 0) > 0;
    return { needsResourceSearch: !hasRag };
  }
}


