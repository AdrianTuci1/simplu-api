import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../interfaces/agent.interface';
import { RagService } from '../../../rag/rag.service';
import { InitialInstructionsService } from '../../../rag/data/initial-instructions';

export class OperatorRagNode {
  constructor(
    private openaiModel: ChatOpenAI,
    private ragService: RagService,
    private initialInstructionsService: InitialInstructionsService,
  ) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      // Get RAG instructions from database using the new service
      const ragInstructions = await this.ragService.getOperatorInstructions(
        state.businessInfo?.businessType || 'general',
        { message: state.message, businessInfo: state.businessInfo }
      );

      // Get initial instructions from database
      const initialInstructions = await this.initialInstructionsService.getInitialInstructions(
        state.businessInfo?.businessType || 'general'
      );

      // Extract instructions from RAG
      let systemInstructions = [];
      if (ragInstructions && ragInstructions.length > 0) {
        try {
          const instructionText = ragInstructions[0]?.instruction || '{}';
          // Check if the instruction is already a JSON string or needs parsing
          let instructionData;
          if (typeof instructionText === 'string') {
            // Try to parse as JSON, if it fails, treat as plain text
            try {
              instructionData = JSON.parse(instructionText);
            } catch (parseError) {
              // If parsing fails, wrap the text in a simple object
              instructionData = {
                instruction: instructionText,
                capabilities: ['frontend_query', 'draft_creation', 'data_analysis'],
                keywords: ['programare', 'pacient', 'serviciu', 'analiza'],
                workflow: ['identify_needs', 'query_frontend', 'create_draft', 'respond']
              };
            }
          } else {
            instructionData = instructionText;
          }
          systemInstructions = [instructionData];
        } catch (error) {
          console.warn('Failed to parse RAG instruction data:', error);
        }
      }

      // If no RAG instructions, use initial instructions from database
      if (systemInstructions.length === 0 && initialInstructions.length > 0) {
        systemInstructions = initialInstructions.map(instruction => ({
          capabilities: this.extractCapabilities(instruction),
          keywords: instruction.metadata?.keywords || [],
          workflow: instruction.workflow?.map(step => step.action) || [],
          role: 'operator',
          businessType: instruction.businessType,
          category: instruction.category
        }));
      }

      // Final fallback to minimal instructions
      if (systemInstructions.length === 0) {
        systemInstructions = [
          {
            capabilities: ["frontend_query", "draft_creation", "data_analysis"],
            keywords: ["programare", "pacient", "serviciu", "analiza"],
            workflow: ["identify_needs", "query_frontend", "create_draft", "respond"],
            role: 'operator',
            businessType: state.businessInfo?.businessType || 'general'
          }
        ];
      }

      return {
        ragResults: ragInstructions,
        systemInstructions: systemInstructions
      };
    } catch (error) {
      console.warn('OperatorRagNode: error loading RAG instructions', error);
      return {
        ragResults: [],
        systemInstructions: []
      };
    }
  }

  private extractCapabilities(instruction: any): string[] {
    const capabilities = [];
    
    if (instruction.requiredPermissions?.includes('data:read')) {
      capabilities.push('data_access');
    }
    if (instruction.requiredPermissions?.includes('reservations:write')) {
      capabilities.push('reservation_management');
    }
    if (instruction.requiredPermissions?.includes('resources:read')) {
      capabilities.push('resource_query');
    }
    
    return capabilities.length > 0 ? capabilities : ['basic_access'];
  }

}
