import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../interfaces/agent.interface';
import { RagService } from '../../../rag/rag.service';

export class FrontendQueryNode {
  constructor(
    private openaiModel: ChatOpenAI,
    private ragService: RagService,
  ) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      // Get RAG instructions for this business type and role
      const ragInstructions = await this.ragService.getOperatorInstructions(
        state.businessInfo?.businessType || 'general',
        { message: state.message, businessInfo: state.businessInfo }
      );

      // Extract available facades from RAG instructions
      // RAG instructions are stored as JSON string in the instruction field
      let availableFacades = {};
      try {
        const instructionData = JSON.parse(ragInstructions[0]?.instruction || '{}');
        availableFacades = instructionData.availableFacades || {};
      } catch (error) {
        console.warn('Failed to parse RAG instruction data:', error);
      }
      
      const prompt = `
      Ești un operator AI care poate interoga frontend-ul pentru a obține date.
      
      Context:
      - Business: ${state.businessInfo?.businessName || 'necunoscut'} (${state.businessInfo?.businessType || 'general'})
      - Mesaj: "${state.message}"
      - Available Facades: ${JSON.stringify(availableFacades)}
      
      Bazat pe availableFacades, determină ce facade să apelezi pentru cererea operatorului.
      Fiecare facade are actions și searchMethods specifice disponibile.
      
      Generează query-uri specifice pentru frontend bazate pe cererea operatorului.
      Folosește searchMethods specifice pentru fiecare facade din availableFacades.
      
      Returnează un JSON cu:
      {
        "frontendQueries": [
          {
            "resourceType": "appointments|patients|services|memberships|members|reservations|guests|rooms",
            "action": "list|get|create|update|delete|search",
            "filters": {},
            "fields": [],
            "parameters": {},
            "searchMethod": "searchByPatientName|searchByCustomField|searchByDate",
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
