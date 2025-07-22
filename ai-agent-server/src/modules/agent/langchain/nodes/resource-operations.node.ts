import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../interfaces/agent.interface';

export class ResourceOperationsNode {
  constructor(private geminiModel: ChatGoogleGenerativeAI) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const prompt = `
      Analizează mesajul utilizatorului și contextul pentru a determina ce operații pe resurse sunt necesare.
      
      Mesaj: ${state.message}
      Business Info: ${JSON.stringify(state.businessInfo)}
      RAG Results: ${JSON.stringify(state.ragResults)}
      
      Generează o listă de operații pe resurse în format JSON:
      {
        "operations": [
          {
            "type": "create|update|delete|get",
            "resourceType": "appointments|customers|services",
            "data": {},
            "priority": "high|medium|low"
          }
        ]
      }
      `;

      const response = await this.geminiModel.invoke([new HumanMessage(prompt)]);
      const operations = JSON.parse(response.content as string);

      // Pentru moment, simulăm operațiile
      const results = operations.operations.map((op: any) => ({
        operation: op,
        result: { success: true, data: { message: `Simulated ${op.type} operation` } }
      }));

      return {
        resourceOperations: results,
        needsExternalApi: this.shouldCallExternalApis(state.message, operations)
      };
    } catch (error) {
      console.error('Error in ResourceOperationsNode:', error);
      return {
        resourceOperations: [],
        needsExternalApi: false
      };
    }
  }

  private shouldCallExternalApis(message: string, operations: any): boolean {
    const externalKeywords = ['sms', 'email', 'whatsapp', 'notifică', 'trimite'];
    return externalKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }
} 