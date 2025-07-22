import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { AgentState } from '../../interfaces/agent.interface';

export class ExternalApiNode {
  constructor(private geminiModel: ChatGoogleGenerativeAI) {}

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