import { AgentState } from '../../../interfaces/agent.interface';

export class LoopNode {
  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    // No-op: back to listening state in the outer system (websocket/http)
    // CRITICAL FIX: Don't create new array, push to existing one
    if (!state.actions) state.actions = [];
    state.actions.push({ type: 'loop', status: 'success', details: { to: 'listening' } });
    return {};
  }
}


