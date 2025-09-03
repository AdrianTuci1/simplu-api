import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { RagService } from '../../../rag/rag.service';
import { AgentState } from '../../interfaces/agent.interface';

export class RagSearchNode {
  constructor(
    private openaiModel: ChatOpenAI,
    private ragService: RagService
  ) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      console.log(`RagSearchNode: Processing message: "${state.message}"`);
      console.log(`RagSearchNode: Business type: ${state.businessInfo?.businessType || 'unknown'}`);
      
      const prompt = `
      Analizează mesajul utilizatorului și determină ce informații sunt necesare din baza de date RAG.
      
      Mesaj utilizator: "${state.message}"
      Tip business: ${state.businessInfo?.businessType || 'general'}
      Context: ${JSON.stringify(state.businessInfo?.settings || {})}
      
      Generează o interogare optimizată pentru căutarea în baza de date RAG.
      Returnează doar interogarea, fără explicații suplimentare.
      `;

      console.log(`RagSearchNode: Sending prompt to OpenAI: "${prompt}"`);
      
      const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
      const query = response.content as string;
      
      console.log(`RagSearchNode: OpenAI generated query: "${query}"`);

      // Executare căutare RAG
      const ragResults = await this.ragService.getInstructionsForRequest(
        query,
        state.businessInfo?.businessType || 'general',
        state.businessInfo?.settings || {}
      );
      
      console.log(`RagSearchNode: Found ${ragResults.length} RAG instructions`);

      return {
        ragResults,
        needsResourceSearch: this.shouldSearchResources(state.message, ragResults)
      };
    } catch (error) {
      console.error('RagSearchNode: Error processing message:', error);
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