import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { RagService } from '../../../../rag/rag.service';
import { ResourcesService } from '../../../../resources/resources.service';
import { AgentState } from '../../../interfaces/agent.interface';

export class RagSearchNode {
  constructor(
    private openaiModel: ChatOpenAI,
    private ragService: RagService,
    private resourcesService: ResourcesService,
  ) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const safeMessage = state.message || '';
      console.log(`RagSearchNode: Processing message: "${safeMessage}"`);
      console.log(`RagSearchNode: Business type: ${state.businessInfo?.businessType || 'unknown'}`);
      const prompt = `
      Analizează mesajul utilizatorului și generează un obiect JSON cu câmpuri simple pentru căutare în RAG.
      
      Mesaj utilizator: "${safeMessage}"
      Tip business: ${state.businessInfo?.businessType || 'general'}
      Context: ${JSON.stringify(state.businessInfo?.settings || {})}
      
      Returnează DOAR un JSON cu structura:
      { "keywords": string[], "category": string }
      - keywords: lista scurtă de 3-8 cuvinte/expresii relevante
      - category: una dintre: rezervare, servicii, clienti, membrii, stock-uri, analiza_date, sms, email, whatsapp
      `;
      console.log(`RagSearchNode: Sending prompt to OpenAI: "${prompt}"`);
      const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
      let parsed: { keywords: string[]; category: string } = { keywords: [], category: 'servicii' };
      try {
        parsed = JSON.parse((response.content as string) || '{}');
      } catch {}
      const query = (parsed.keywords || []).join(' ');
      console.log(`RagSearchNode: OpenAI generated keywords: ${JSON.stringify(parsed)}`);
      const ragResults = await this.ragService.getInstructionsForRequest(
        query || (state.message || ''),
        state.businessInfo?.businessType || 'general',
        state.businessInfo?.settings || {}
      );
      console.log(`RagSearchNode: Found ${ragResults.length} RAG instructions`);

      // For webhook, also check dynamic memory and database for this user to build understanding context
      let understandingContext: any = state.understandingContext || {};
      if (state.source === 'webhook' || state.source === 'websocket') {
        const memory = {
          business: state.dynamicBusinessMemory || {},
          user: state.dynamicUserMemory || {},
        };
        const recentDb = await this.resourcesService.getRecentUserRelatedResources(
          state.businessId || (state.businessInfo?.businessId as any) || '',
          state.locationId || 'default',
          state.userId || '',
          25,
        );
        understandingContext = { memory, recentDb };
      }
      return {
        ragResults,
        understandingContext,
        needsResourceSearch: this.shouldSearchResources(state.message, ragResults)
      };
    } catch (error) {
      console.warn('RagSearchNode: graceful fallback, likely empty initial data:', error?.message || error);
      return { ragResults: [], needsResourceSearch: false };
    }
  }

  private shouldSearchResources(message: string | undefined, ragResults: any[]): boolean {
    const resourceKeywords = ['creează', 'modifică', 'șterge', 'rezervă', 'programează'];
    if (!message) return false;
    return resourceKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }
}


