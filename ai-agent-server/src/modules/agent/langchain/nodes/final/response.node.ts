import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../../interfaces/agent.interface';

export class ResponseNode {
  constructor(private openaiModel: ChatOpenAI) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    const prompt = `
      Generează un răspuns natural și util pentru utilizator bazat pe contextul și operațiile efectuate.
      
      Mesaj original: "${state.message}"
      Business: ${state.businessInfo?.businessName || 'Business necunoscut'}
      Tip business: ${state.businessInfo?.businessType || 'general'}
      Operații efectuate: ${JSON.stringify(state.resourceOperations)}
      Rezultate API externe: ${JSON.stringify(state.externalApiResults)}
      
      Răspunsul trebuie să fie:
      - Natural și prietenos
      - Specific pentru tipul de business
      - Să includă informații relevante din operațiile efectuate
      - Să fie în limba română
      - Să nu depășească 200 de cuvinte
      - Să răspundă la mesajul original al utilizatorului
      `;
    const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
    return { response: response.content as string, actions: this.extractActions(state) };
  }

  private extractActions(state: AgentState): any[] {
    const actions: any[] = [];
    (state.resourceOperations || []).forEach(op => {
      if (op?.result?.success) {
        actions.push({ type: 'resource_operation', status: 'success', details: op.result });
      }
    });
    (state.externalApiResults || []).forEach(result => {
      actions.push({ type: 'external_api_call', status: result.success ? 'success' : 'failed', details: result });
    });
    return actions;
  }
}


