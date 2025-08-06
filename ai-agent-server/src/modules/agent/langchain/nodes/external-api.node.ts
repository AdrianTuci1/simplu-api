import { ChatOpenAI } from '@langchain/openai';
import { AgentState } from '../../interfaces/agent.interface';

export class ExternalApiNode {
  constructor(private openaiModel: ChatOpenAI) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      // Simulare apeluri API externe
      const externalApiResults = [
        {
          type: 'notification',
          success: true,
          data: { message: 'Notification sent successfully' }
        }
      ];

      return {
        externalApiResults
      };
    } catch (error) {
      console.error('Error in ExternalApiNode:', error);
      return {
        externalApiResults: []
      };
    }
  }
} 