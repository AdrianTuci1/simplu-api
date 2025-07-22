import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../interfaces/agent.interface';

export class ResponseNode {
  constructor(private geminiModel: ChatGoogleGenerativeAI) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const prompt = `
      Generează un răspuns natural și util pentru utilizator bazat pe contextul și operațiile efectuate.
      
      Mesaj original: ${state.message}
      Business: ${state.businessInfo?.businessName}
      Tip business: ${state.businessInfo?.businessType}
      Operații efectuate: ${JSON.stringify(state.resourceOperations)}
      Rezultate API externe: ${JSON.stringify(state.externalApiResults)}
      
      Răspunsul trebuie să fie:
      - Natural și prietenos
      - Specific pentru tipul de business
      - Să includă informații relevante din operațiile efectuate
      - Să fie în limba română
      - Să nu depășească 200 de cuvinte
      `;

      const response = await this.geminiModel.invoke([new HumanMessage(prompt)]);
      
      return {
        response: response.content as string,
        actions: this.extractActions(state)
      };
    } catch (error) {
      console.error('Error in ResponseNode:', error);
      return {
        response: 'Îmi pare rău, dar am întâmpinat o problemă la generarea răspunsului.',
        actions: []
      };
    }
  }

  private extractActions(state: AgentState): any[] {
    const actions: any[] = [];
    
    // Adăugare acțiuni bazate pe operațiile efectuate
    state.resourceOperations.forEach(op => {
      if (op.result.success) {
        actions.push({
          type: 'resource_operation',
          status: 'success',
          details: op.result
        });
      }
    });

    state.externalApiResults.forEach(result => {
      actions.push({
        type: 'external_api_call',
        status: result.success ? 'success' : 'failed',
        details: result
      });
    });

    return actions;
  }
} 