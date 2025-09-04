import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../interfaces/agent.interface';

export class IdentificationNode {
  constructor(private openaiModel: ChatOpenAI) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const prompt = `
      Identifică rolul solicitantului în baza mesajului și a sursei.
      Mesaj: "${state.message}"
      Sursa: ${state.source}
      Returnează JSON: { "role": "operator|client_nou|client_existent|webhook", "needsIntrospection": boolean }
      `;

      const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
      const parsed = JSON.parse((response.content as string) || '{}');

      return {
        role: parsed.role || 'client_existent',
        needsIntrospection: !!parsed.needsIntrospection
      };
    } catch (error) {
      console.warn('IdentificationNode: fallback role to client_existent', error);
      return { role: 'client_existent', needsIntrospection: false };
    }
  }
}

