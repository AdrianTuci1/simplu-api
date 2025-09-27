import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../interfaces/agent.interface';

export class DraftCreationNode {
  constructor(
    private openaiModel: ChatOpenAI,
  ) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      // Check if we have frontend query results to work with
      if (!state.frontendQueryResults || state.frontendQueryResults.length === 0) {
        return {
          drafts: [],
          needsDraftCreation: false
        };
      }

      const prompt = `
      Ești un operator AI care creează draft-uri bazate pe datele obținute de la frontend.
      
      Context:
      - Business: ${state.businessInfo?.businessName || 'necunoscut'} (${state.businessInfo?.businessType || 'general'})
      - Mesaj: "${state.message}"
      - Rezultate frontend: ${JSON.stringify(state.frontendQueryResults)}
      
      Creează draft-uri utile pentru operator bazate pe datele disponibile.
      
      Returnează un JSON cu:
      {
        "drafts": [
          {
            "type": "appointment_draft|patient_draft|service_draft|report_draft",
            "title": "string",
            "content": {},
            "suggestions": [],
            "priority": "high|medium|low"
          }
        ],
        "needsDraftCreation": true
      }
      `;

      const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
      const parsed = JSON.parse((response.content as string) || '{}');

      return {
        drafts: parsed.drafts || [],
        needsDraftCreation: !!parsed.needsDraftCreation
      };
    } catch (error) {
      console.warn('DraftCreationNode: error creating drafts', error);
      return {
        drafts: [],
        needsDraftCreation: false
      };
    }
  }
}
