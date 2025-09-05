import { AgentState } from '../../../interfaces/agent.interface';

export class LoopNode {
  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    // No-op: back to listening state in the outer system (websocket/http)
    return { actions: [...(state.actions || []), { type: 'loop', status: 'success', details: { to: 'listening' } }] } as any;
  }
}


