import { AgentState } from '../../../interfaces/agent.interface';

export class ExternalRouterNode {
  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    return state;
  }
}


