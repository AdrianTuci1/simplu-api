import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../interfaces/agent.interface';

export class OperatorResponseNode {
  constructor(
    private openaiModel: ChatOpenAI,
  ) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      // Check if the message explicitly requests help with resource creation
      const needsDraft = this.checkIfNeedsDraft(state.message);
      
      const prompt = `
      Ești un operator AI care răspunde concis și profesional.
      
      Context:
      - Business: ${state.businessInfo?.businessName || 'necunoscut'} (${state.businessInfo?.businessType || 'general'})
      - Mesaj: "${state.message}"
      - Query-uri frontend: ${JSON.stringify(state.frontendQueries || [])}
      - Rezultate frontend: ${JSON.stringify(state.frontendQueryResults || [])}
      - Draft-uri create: ${JSON.stringify(state.drafts || [])}
      - Necesită draft pentru crearea resursei: ${needsDraft}
      
      Generează un răspuns concis și profesional pentru operator.
      
      Răspunsul trebuie să fie:
      - Concis și la obiect
      - Să includă datele relevante obținute
      - Să sugereze următorii pași dacă este cazul
      - Să fie în limba română
      - Să nu depășească 150 de cuvinte
      `;

      const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
      
      const result: Partial<AgentState> = {
        response: response.content as string,
        actions: this.generateActions(state)
      };

      // Include draft information if explicitly requested
      if (needsDraft && state.drafts && state.drafts.length > 0) {
        result.draft = state.drafts[0]; // Include the first draft
      }

      return result;
    } catch (error) {
      console.warn('OperatorResponseNode: error generating response', error);
      return {
        response: 'Îmi pare rău, dar am întâmpinat o problemă la generarea răspunsului.',
        actions: []
      };
    }
  }

  private checkIfNeedsDraft(message: string): boolean {
    const draftKeywords = [
      'creează', 'creare', 'adaugă', 'adăugare', 'nou', 'nouă',
      'pacient', 'programare', 'serviciu', 'rezervare', 'client',
      'draft', 'template', 'formular', 'formulară'
    ];
    
    const lowerMessage = message.toLowerCase();
    return draftKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private generateActions(state: AgentState): any[] {
    const actions = [];
    
    // Add action to view frontend data if available
    if (state.frontendQueryResults && state.frontendQueryResults.length > 0) {
      actions.push({
        type: 'view_data',
        title: 'Vezi datele obținute',
        data: state.frontendQueryResults
      });
    }
    
    // Add action to work with drafts if available
    if (state.drafts && state.drafts.length > 0) {
      actions.push({
        type: 'work_with_drafts',
        title: 'Lucrează cu draft-urile create',
        data: state.drafts
      });
    }
    
    // Add action to modify queries if needed
    if (state.frontendQueries && state.frontendQueries.length > 0) {
      actions.push({
        type: 'modify_queries',
        title: 'Modifică query-urile',
        data: state.frontendQueries
      });
    }
    
    return actions;
  }
}
