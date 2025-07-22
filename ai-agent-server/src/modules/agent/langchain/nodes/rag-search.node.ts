import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';
import { RagService } from '../../../rag/rag.service';
import { AgentState } from '../../interfaces/agent.interface';

export class RagSearchNode {
  constructor(
    private geminiModel: ChatGoogleGenerativeAI,
    private ragService: RagService
  ) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const prompt = `
      Analizează mesajul utilizatorului și determină ce informații sunt necesare din baza de date RAG.
      
      Mesaj utilizator: ${state.message}
      Tip business: ${state.businessInfo?.businessType}
      Context: ${JSON.stringify(state.businessInfo?.settings)}
      
      Generează o interogare optimizată pentru căutarea în baza de date RAG.
      Returnează doar interogarea, fără explicații suplimentare.
      `;

      const response = await this.geminiModel.invoke([new HumanMessage(prompt)]);
      const query = response.content as string;

      // Executare căutare RAG
      const ragResults = await this.ragService.getInstructionsForRequest(
        query,
        state.businessInfo?.businessType || 'general',
        state.businessInfo?.settings || {}
      );

      return {
        ragResults,
        needsResourceSearch: this.shouldSearchResources(state.message, ragResults)
      };
    } catch (error) {
      console.error('Error in RagSearchNode:', error);
      return {
        ragResults: [],
        needsResourceSearch: false
      };
    }
  }

  private shouldSearchResources(message: string, ragResults: any[]): boolean {
    // Logică pentru determinarea dacă sunt necesare operații pe resurse
    const resourceKeywords = ['creează', 'modifică', 'șterge', 'rezervă', 'programează'];
    return resourceKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }
} 