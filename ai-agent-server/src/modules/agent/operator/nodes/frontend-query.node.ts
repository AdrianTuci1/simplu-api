import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../interfaces/agent.interface';

export class FrontendQueryNode {
  constructor(
    private openaiModel: ChatOpenAI,
  ) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const prompt = `
      Ești un operator AI care poate interoga frontend-ul pentru a obține date.
      
      Context:
      - Business: ${state.businessInfo?.businessName || 'necunoscut'} (${state.businessInfo?.businessType || 'general'})
      - Mesaj: "${state.message}"
      - Resurse descoperite: ${JSON.stringify(state.discoveredResourceTypes || [])}
      
      Generează query-uri pentru frontend bazate pe cererea operatorului.
      
      Returnează un JSON cu:
      {
        "frontendQueries": [
          {
            "type": "data_query|draft_creation|data_analysis",
            "repository": "appointments|patients|services|analytics",
            "filters": {},
            "fields": [],
            "purpose": "string"
          }
        ],
        "needsFrontendInteraction": true
      }
      `;

      const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
      const parsed = JSON.parse((response.content as string) || '{}');

      return {
        frontendQueries: parsed.frontendQueries || [],
        needsFrontendInteraction: !!parsed.needsFrontendInteraction,
        frontendQueryResults: []
      };
    } catch (error) {
      console.warn('FrontendQueryNode: error generating frontend queries', error);
      return {
        frontendQueries: [],
        needsFrontendInteraction: false,
        frontendQueryResults: []
      };
    }
  }
}
