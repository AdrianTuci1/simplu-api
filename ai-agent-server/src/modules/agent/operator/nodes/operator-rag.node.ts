import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../interfaces/agent.interface';
import { RagService } from '../../../rag/rag.service';

export class OperatorRagNode {
  constructor(
    private openaiModel: ChatOpenAI,
    private ragService: RagService,
  ) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      // Get operator-specific RAG instructions
      const ragInstructions = await this.ragService.getOperatorInstructions(
        state.businessInfo?.businessType || 'general',
        {
          businessId: state.businessId,
          locationId: state.locationId,
          userId: state.userId,
          message: state.message,
          role: 'operator'
        }
      );

      // Process instructions with OpenAI to determine relevance
      const relevantInstructions = await this.filterRelevantInstructions(
        state,
        ragInstructions
      );

      return {
        ragResults: relevantInstructions.map(instruction => ({
          instruction: instruction.instruction,
          workflow: instruction.workflow,
          successCriteria: instruction.successCriteria,
          notificationTemplate: instruction.notificationTemplate
        })),
        systemInstructions: relevantInstructions
      };
    } catch (error) {
      console.warn('OperatorRagNode: error loading RAG instructions', error);
      return {
        ragResults: [],
        systemInstructions: []
      };
    }
  }

  private async filterRelevantInstructions(
    state: AgentState,
    instructions: any[]
  ): Promise<any[]> {
    if (instructions.length === 0) {
      return [];
    }

    const prompt = `
    Ești un agent AI pentru operatori. Analizează instrucțiunile RAG și determină care sunt relevante pentru cererea curentă.
    
    Context:
    - Business: ${state.businessInfo?.businessName || 'necunoscut'} (${state.businessInfo?.businessType || 'general'})
    - Mesaj: "${state.message}"
    - Rol: operator
    - Capabilități: frontend_query, data_analysis, draft_creation, query_modification
    
    Instrucțiuni disponibile:
    ${JSON.stringify(instructions.map(i => ({
      id: i.instructionId,
      category: i.category,
      instruction: i.instruction.substring(0, 200) + '...',
      keywords: i.metadata?.keywords || [],
      examples: i.metadata?.examples || []
    })))}
    
    Returnează un JSON cu ID-urile instrucțiunilor relevante:
    {
      "relevantInstructions": ["instructionId1", "instructionId2"],
      "reasoning": "Explicație pentru selecție"
    }
    `;

    try {
      const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
      const parsed = JSON.parse((response.content as string) || '{}');
      
      const relevantIds = parsed.relevantInstructions || [];
      return instructions.filter(instruction => 
        relevantIds.includes(instruction.instructionId)
      );
    } catch (error) {
      console.warn('Error filtering RAG instructions:', error);
      // Fallback: return first few instructions
      return instructions.slice(0, 3);
    }
  }
}
