import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../../interfaces/agent.interface';

export class ResourceOperationsNode {
  constructor(private openaiModel: ChatOpenAI) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      console.log(`ResourceOperationsNode: Processing message: "${state.message}"`);
      console.log(`ResourceOperationsNode: Business info:`, {
        businessId: state.businessInfo?.businessId,
        businessType: state.businessInfo?.businessType,
        businessName: state.businessInfo?.businessName
      });
      console.log(`ResourceOperationsNode: RAG results count: ${state.ragResults?.length || 0}`);
      const prompt = `
      Analizează mesajul utilizatorului și contextul pentru a determina ce operații pe resurse sunt necesare.
      
      Mesaj: "${state.message}"
      Business Info: ${JSON.stringify(state.businessInfo || {})}
      RAG Results: ${JSON.stringify(state.ragResults || [])}
      
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
      console.log(`ResourceOperationsNode: Sending prompt to OpenAI: "${prompt}"`);
      const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
      const operations = JSON.parse(response.content as string);
      console.log(`ResourceOperationsNode: OpenAI generated operations:`, operations);
      const results = operations.operations.map((op: any) => ({
        operation: op,
        result: { success: true, data: { message: `Simulated ${op.type} operation` } }
      }));
      console.log(`ResourceOperationsNode: Generated ${results.length} operation results`);
      return {
        resourceOperations: results,
        needsExternalApi: this.shouldCallExternalApis(state.message, operations)
      };
    } catch (error) {
      console.error('ResourceOperationsNode: Error processing message:', error);
      return { resourceOperations: [], needsExternalApi: false };
    }
  }

  private shouldCallExternalApis(message: string, operations: any): boolean {
    const externalKeywords = ['sms', 'email', 'whatsapp', 'notifică', 'trimite'];
    return externalKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }
}


