import { ChatOpenAI } from '@langchain/openai';
import { AgentState } from '../../interfaces/agent.interface';

export class ExternalApiNode {
  constructor(private openaiModel: ChatOpenAI) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      console.log(`ExternalApiNode: Processing message: "${state.message}"`);
      console.log(`ExternalApiNode: Resource operations count: ${state.resourceOperations?.length || 0}`);
      
      // Simulare apeluri API externe
      const externalApiResults = [
        {
          type: 'notification',
          success: true,
          data: { message: 'Notification sent successfully' }
        }
      ];
      
      console.log(`ExternalApiNode: Generated ${externalApiResults.length} external API results`);

      return {
        externalApiResults
      };
    } catch (error) {
      console.error('ExternalApiNode: Error processing message:', error);
      return {
        externalApiResults: []
      };
    }
  }
} 