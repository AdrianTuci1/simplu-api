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
      // Build conversation context from recent session messages
      const conversationContext = state.sessionMessages && state.sessionMessages.length > 0 
        ? state.sessionMessages.map(msg => `${msg.type}: ${msg.content}`).join('\n')
        : 'Prima interacțiune';

      // Build time context for better understanding
      const timeContext = state.timeContext 
        ? `Timpul curent: ${state.timeContext.currentTime}, Data: ${state.timeContext.currentDate}, Ziua: ${state.timeContext.dayOfWeek}, Ore de program: ${state.timeContext.isBusinessHours ? 'Da' : 'Nu'}`
        : 'Timpul nu este disponibil';

      const prompt = `
      Analizează mesajul utilizatorului și generează un obiect JSON cu câmpuri simple pentru căutare în RAG.
      
      Mesaj utilizator: "${safeMessage}"
      Tip business: ${state.businessInfo?.businessType || 'general'}
      
      Context temporal:
      ${timeContext}
      
      Context conversație recentă:
      ${conversationContext}
      
      Returnează DOAR un JSON cu structura:
      { "keywords": string[], "category": string }
      - keywords: lista scurtă de 3-8 cuvinte/expresii relevante (include și contextul din conversația anterioară și timpul curent)
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
          user: {
            current: state.dynamicUserMemory?.current || {},
            allPlatforms: state.dynamicUserMemory?.allPlatforms || []
          },
        };
        const recentDb = await this.resourcesService.getRecentUserRelatedResources(
          state.businessId || (state.businessInfo?.businessId as any) || '',
          state.locationId || 'default',
          state.userId || '',
          20, // CRITICAL FIX: Reduced from 25 to 5 to prevent memory issues
        );
        
        // Include session conversation context
        const sessionContext = {
          recentMessages: state.sessionMessages || [],
          conversationLength: state.sessionMessages?.length || 0,
          lastUserMessage: state.sessionMessages?.find(msg => msg.type === 'user')?.content || '',
          lastAgentMessage: state.sessionMessages?.find(msg => msg.type === 'agent')?.content || ''
        };
        
        // Include time context
        const timeContext = state.timeContext || {};
        
        understandingContext = { memory, recentDb, sessionContext, timeContext };
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


