import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { 
  ActionType, 
  ActionCategory, 
  ActionRequest, 
  ActionContext, 
  DecisionLevel,
  ActionDefinition 
} from './action.types';
import { ActionRegistryService } from './action-registry.service';
import { TokenService } from '../token/token.service';
import { TokenOperationType } from '../token/token.entity';
import { ApiResourceService } from '../resources/api-resource.service';

export interface DecisionResult {
  actions: ActionRequest[];
  decisionLevel: DecisionLevel;
  reasoning: string;
  confidence: number;
  requiresHumanInput: boolean;
}

@Injectable()
export class DecisionEngineService {
  private readonly logger = new Logger(DecisionEngineService.name);
  private model: ChatOpenAI;

  constructor(
    private configService: ConfigService,
    private actionRegistry: ActionRegistryService,
    private tokenService: TokenService,
    private apiResourceService: ApiResourceService,
  ) {
    this.initializeModel();
  }

  private initializeModel() {
    const apiKey = this.configService.get<string>('OPENROUTER_API_KEY');
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    this.model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: 'deepseek/deepseek-r1-0528:free',
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://github.com/your-repo',
          'X-Title': 'AI Agent Decision Engine',
        },
      },
    });
  }

  async analyzeMessageAndDecide(
    message: string,
    context: ActionContext,
    conversationHistory: any[] = []
  ): Promise<DecisionResult> {
    try {
      // Get available actions for this user
      const availableActions = await this.getAvailableActions(context);
      
      // Create decision prompt
      const decisionPrompt = this.createDecisionPrompt(message, context, availableActions, conversationHistory);
      
      // Get AI decision
      const aiDecision = await this.getAIDecision(decisionPrompt);
      
      // Parse and validate the decision
      const parsedDecision = this.parseDecision(aiDecision, availableActions);
      
      // Check token availability for proposed actions
      const validatedActions = await this.validateActionTokens(parsedDecision.actions, context);
      
      // Determine overall decision level
      const decisionLevel = this.determineDecisionLevel(validatedActions);
      
      return {
        actions: validatedActions,
        decisionLevel,
        reasoning: parsedDecision.reasoning,
        confidence: parsedDecision.confidence,
        requiresHumanInput: decisionLevel !== DecisionLevel.AUTOMATIC,
      };
    } catch (error) {
      this.logger.error(`Error in decision engine: ${error.message}`);
      throw error;
    }
  }

  private async getAvailableActions(context: ActionContext): Promise<ActionDefinition[]> {
    const allActions = this.actionRegistry.getAllActions();
    
    // Get user permissions from API server if not provided
    let userPermissions = context.userPermissions;
    if (!userPermissions || userPermissions.length === 0) {
      userPermissions = await this.apiResourceService.getUserPermissions(
        context.tenantId,
        context.userId,
        context.locationId
      );
    }
    
    // Filter by user permissions if available
    if (userPermissions && userPermissions.length > 0) {
      return allActions.filter(action => 
        action.requiredPermissions.some(permission => 
          userPermissions!.includes(permission)
        )
      );
    }
    
    return allActions;
  }

  private createDecisionPrompt(
    message: string,
    context: ActionContext,
    availableActions: ActionDefinition[],
    conversationHistory: any[]
  ): string {
    const actionsByCategory = this.groupActionsByCategory(availableActions);
    
    return `
You are an AI decision engine for a business automation system. Analyze the user's message and determine what actions should be taken.

CONTEXT:
- Tenant ID: ${context.tenantId}
- User ID: ${context.userId}
- Location ID: ${context.locationId || 'Not specified'}
- Session ID: ${context.sessionId || 'Not specified'}

USER MESSAGE: "${message}"

CONVERSATION HISTORY:
${conversationHistory.map(msg => `- ${msg.role}: ${msg.content}`).join('\n')}

AVAILABLE ACTIONS BY CATEGORY:

${Object.entries(actionsByCategory).map(([category, actions]) => `
${category.toUpperCase()}:
${actions.map(action => `- ${action.type}: ${action.description} (Cost: ${action.tokenCost} tokens)`).join('\n')}
`).join('\n')}

INSTRUCTIONS:
1. Analyze the user's message and determine what actions are needed
2. Consider the conversation history for context
3. Choose the most appropriate actions from the available list
4. Provide reasoning for your decision
5. Estimate confidence level (0-100)

RESPONSE FORMAT (JSON):
{
  "actions": [
    {
      "type": "action_type",
      "parameters": {
        "param1": "value1",
        "param2": "value2"
      },
      "priority": "low|medium|high|urgent"
    }
  ],
  "reasoning": "Explanation of why these actions were chosen",
  "confidence": 85
}

Only include actions that are directly relevant to the user's request. If no actions are needed, return an empty actions array.
`;
  }

  private groupActionsByCategory(actions: ActionDefinition[]): Record<string, ActionDefinition[]> {
    return actions.reduce((acc, action) => {
      const category = action.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(action);
      return acc;
    }, {} as Record<string, ActionDefinition[]>);
  }

  private async getAIDecision(prompt: string): Promise<string> {
    const chain = RunnableSequence.from([
      PromptTemplate.fromTemplate(prompt),
      this.model,
      new StringOutputParser(),
    ]);

    return chain.invoke({});
  }

  private parseDecision(aiDecision: string, availableActions: ActionDefinition[]): {
    actions: ActionRequest[];
    reasoning: string;
    confidence: number;
  } {
    try {
      // Try to parse JSON response
      const parsed = JSON.parse(aiDecision);
      
      const actions: ActionRequest[] = [];
      
      if (parsed.actions && Array.isArray(parsed.actions)) {
        for (const actionData of parsed.actions) {
          const actionDef = availableActions.find(a => a.type === actionData.type);
          if (actionDef) {
            // Validate parameters
            const validation = this.actionRegistry.validateActionParameters(
              actionData.type as ActionType,
              actionData.parameters || {}
            );
            
            if (validation.valid) {
              actions.push({
                type: actionData.type as ActionType,
                context: {
                  tenantId: '',
                  userId: '',
                }, // Will be filled by caller
                parameters: actionData.parameters || {},
                priority: actionData.priority || 'medium',
              });
            } else {
              this.logger.warn(`Invalid parameters for action ${actionData.type}: ${validation.errors.join(', ')}`);
            }
          }
        }
      }
      
      return {
        actions,
        reasoning: parsed.reasoning || 'No reasoning provided',
        confidence: parsed.confidence || 50,
      };
    } catch (error) {
      this.logger.error(`Failed to parse AI decision: ${error.message}`);
      return {
        actions: [],
        reasoning: 'Failed to parse AI decision',
        confidence: 0,
      };
    }
  }

  private async validateActionTokens(actions: ActionRequest[], context: ActionContext): Promise<ActionRequest[]> {
    const validatedActions: ActionRequest[] = [];
    
    for (const action of actions) {
      const actionDef = this.actionRegistry.getActionDefinition(action.type);
      if (!actionDef) continue;
      
      // Map action type to token operation type
      const tokenOperationType = this.mapActionToTokenOperation(action.type);
      
      // Check if tokens are available
      const hasTokens = await this.tokenService.checkTokenAvailability(
        context.tenantId,
        tokenOperationType,
        context.locationId
      );
      
      if (hasTokens) {
        validatedActions.push(action);
      } else {
        this.logger.warn(`Insufficient tokens for action ${action.type}`);
      }
    }
    
    return validatedActions;
  }

  private mapActionToTokenOperation(actionType: ActionType): TokenOperationType {
    const mapping: Record<ActionType, TokenOperationType> = {
      [ActionType.SEND_WHATSAPP]: TokenOperationType.WHATSAPP_CONVERSATION,
      [ActionType.READ_WHATSAPP]: TokenOperationType.WHATSAPP_CONVERSATION,
      [ActionType.SEND_SMS]: TokenOperationType.SMS,
      [ActionType.SEND_EMAIL]: TokenOperationType.EMAIL,
      [ActionType.READ_EMAIL]: TokenOperationType.EMAIL,
      [ActionType.MAKE_PHONE_CALL]: TokenOperationType.ELEVEN_LABS_CALL,
      [ActionType.RECEIVE_PHONE_CALL]: TokenOperationType.ELEVEN_LABS_CALL,
      [ActionType.ANALYZE_DATA]: TokenOperationType.INTERNAL_API_LLM,
      [ActionType.GENERATE_SUGGESTIONS]: TokenOperationType.INTERNAL_API_LLM,
      [ActionType.VALIDATE_INPUT]: TokenOperationType.INTERNAL_API_LLM,
      [ActionType.CREATE_RESOURCE]: TokenOperationType.INTERNAL_API_LLM,
      [ActionType.READ_RESOURCE]: TokenOperationType.INTERNAL_API_LLM,
      [ActionType.UPDATE_RESOURCE]: TokenOperationType.INTERNAL_API_LLM,
      [ActionType.DELETE_RESOURCE]: TokenOperationType.INTERNAL_API_LLM,
      [ActionType.LIST_RESOURCES]: TokenOperationType.INTERNAL_API_LLM,
      [ActionType.BOOK_APPOINTMENT]: TokenOperationType.INTERNAL_API_LLM,
      [ActionType.CANCEL_APPOINTMENT]: TokenOperationType.INTERNAL_API_LLM,
      [ActionType.PROCESS_PAYMENT]: TokenOperationType.INTERNAL_API_LLM,
      [ActionType.GENERATE_REPORT]: TokenOperationType.INTERNAL_API_LLM,
      [ActionType.REQUEST_HUMAN_APPROVAL]: TokenOperationType.INTERNAL_API_LLM,
      [ActionType.ESCALATE_ISSUE]: TokenOperationType.INTERNAL_API_LLM,
      [ActionType.NOTIFY_COORDINATOR]: TokenOperationType.INTERNAL_API_LLM,
    };
    
    return mapping[actionType] || TokenOperationType.INTERNAL_API_LLM;
  }

  private determineDecisionLevel(actions: ActionRequest[]): DecisionLevel {
    if (actions.length === 0) {
      return DecisionLevel.AUTOMATIC;
    }
    
    // Check if any action requires approval
    const requiresApproval = actions.some(action => {
      const actionDef = this.actionRegistry.getActionDefinition(action.type);
      return actionDef?.requiresApproval || actionDef?.defaultDecisionLevel === DecisionLevel.APPROVAL_REQUIRED;
    });
    
    if (requiresApproval) {
      return DecisionLevel.APPROVAL_REQUIRED;
    }
    
    // Check for consultation level actions
    const requiresConsultation = actions.some(action => {
      const actionDef = this.actionRegistry.getActionDefinition(action.type);
      return actionDef?.defaultDecisionLevel === DecisionLevel.CONSULTATION;
    });
    
    if (requiresConsultation) {
      return DecisionLevel.CONSULTATION;
    }
    
    // Check for suggestion level actions
    const requiresSuggestion = actions.some(action => {
      const actionDef = this.actionRegistry.getActionDefinition(action.type);
      return actionDef?.defaultDecisionLevel === DecisionLevel.SUGGESTION;
    });
    
    if (requiresSuggestion) {
      return DecisionLevel.SUGGESTION;
    }
    
    return DecisionLevel.AUTOMATIC;
  }
} 