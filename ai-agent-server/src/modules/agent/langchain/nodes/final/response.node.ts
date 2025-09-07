import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../../interfaces/agent.interface';

export class ResponseNode {
  constructor(private openaiModel: ChatOpenAI) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    const userRole = state.role || 'client_nou';
    const userCapabilities = state.userCapabilities;
    const responseStyle = userCapabilities?.responseStyle || 'friendly_guidance';
    
    const prompt = this.createRoleSpecificPrompt(state, userRole, responseStyle);
    const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
    return { response: response.content as string, actions: this.extractActions(state) };
  }

  private createRoleSpecificPrompt(state: AgentState, userRole: string, responseStyle: string): string {
    const baseContext = `
      Mesaj original: "${state.message}"
      Business: ${state.businessInfo?.businessName || 'Business necunoscut'}
      Tip business: ${state.businessInfo?.businessType || 'general'}
      Operații efectuate: ${JSON.stringify(state.resourceOperations)}
      Rezultate API externe: ${JSON.stringify(state.externalApiResults)}
    `;

    if (userRole === 'operator' && responseStyle === 'concise') {
      return `
        Generează un răspuns scurt și concis pentru un operator.
        
        ${baseContext}
        
        Răspunsul trebuie să fie:
        - Scurt și la obiect (max 50 de cuvinte)
        - Focusat pe informațiile esențiale
        - Profesional și direct
        - Să includă doar datele relevante
        - Să fie în limba română
        - Să nu includă explicații lungi sau politicoase
      `;
    } else {
      return `
        Generează un răspuns prietenos și util pentru un client.
        
        ${baseContext}
        
        Răspunsul trebuie să fie:
        - Prietenos și încurajator
        - Specific pentru tipul de business
        - Să ghideze clientul către informațiile de care are nevoie
        - Să includă informații relevante din operațiile efectuate
        - Să fie în limba română
        - Să nu depășească 150 de cuvinte
        - Să răspundă la mesajul original al utilizatorului
        - Să nu includă date personale ale altor clienți
      `;
    }
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


