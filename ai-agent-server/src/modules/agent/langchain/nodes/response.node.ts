import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../interfaces/agent.interface';

export class ResponseNode {
  constructor(private openaiModel: ChatOpenAI) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
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
      
      return {
        response: response.content as string,
        actions: this.extractActions(state)
      };
    } catch (error) {
      console.error('Error in ResponseNode:', error);
      
      // Fallback response bazat pe context
      const fallbackResponse = this.generateFallbackResponse(state);
      
      return {
        response: fallbackResponse,
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

  private generateFallbackResponse(state: AgentState): string {
    const businessType = state.businessInfo?.businessType || 'general';
    const message = state.message.toLowerCase();
    
    if (message.includes('salut') || message.includes('bună') || message.includes('hello')) {
      switch (businessType) {
        case 'dental':
          return 'Salut! Sunt asistentul virtual al cabinetului dental. Cum vă pot ajuta astăzi?';
        case 'gym':
          return 'Salut! Sunt asistentul virtual al salii de fitness. Cum vă pot ajuta astăzi?';
        case 'hotel':
          return 'Salut! Sunt asistentul virtual al hotelului. Cum vă pot ajuta astăzi?';
        default:
          return 'Salut! Sunt asistentul virtual al business-ului. Cum vă pot ajuta astăzi?';
      }
    }
    
    if (message.includes('ajuta') || message.includes('ajutor') || message.includes('help')) {
      return 'Desigur! Sunt aici să vă ajut. Vă rog să-mi spuneți mai specific ce aveți nevoie.';
    }
    
    if (message.includes('rezervare') || message.includes('booking') || message.includes('programare')) {
      return 'Înțeleg că doriți să faceți o rezervare. Vă rog să-mi spuneți data și ora dorită.';
    }
    
    return 'Îmi pare rău, dar am întâmpinat o problemă tehnica. Vă rog să încercați din nou sau să contactați suportul.';
  }
} 