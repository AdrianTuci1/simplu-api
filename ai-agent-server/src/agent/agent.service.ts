import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { EventsService } from '../events/events.service';
import { PolicyService, Action, Resource } from '../policy/policy.service';
import { AgentConfigService, DecisionLevel } from './config/agent.config';
import { DecisionEngineService } from '../actions/decision-engine.service';
import { ActionExecutorService } from '../actions/action-executor.service';
import { TokenService } from '../token/token.service';
import { ConversationsService } from '../conversations/conversations.service';
import { v4 as uuidv4 } from 'uuid';
import { KafkaMessage } from '../events/kafka.service';

export type MessageType = 'user.message' | 'agent.response';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private model: ChatOpenAI;

  constructor(
    private configService: ConfigService,
    private eventsService: EventsService,
    private policyService: PolicyService,
    private agentConfigService: AgentConfigService,
    private decisionEngine: DecisionEngineService,
    private actionExecutor: ActionExecutorService,
    private tokenService: TokenService,
    private conversationsService: ConversationsService,
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
          'HTTP-Referer': 'https://github.com/your-repo', // Required for OpenRouter
          'X-Title': 'AI Agent Server', // Optional, shows in rankings
        },
      },
    });
  }

  private async publishKafkaEvent(tenantId: string, userId: string, sessionId: string, type: MessageType, payload: any) {
    const message: KafkaMessage = {
      tenantId,
      userId,
      sessionId,
      messageId: uuidv4(),
      type,
      payload,
      timestamp: new Date().toISOString()
    };
    await this.eventsService.publishEvent('agent.events', message);
  }

  private async determineTemplateType(message: string): Promise<string> {
    const prompt = PromptTemplate.fromTemplate(`
      Analyze the following message and determine the most appropriate template type.
      Choose from: greeting, question, complaint, request, feedback, or general.
      
      Message: {message}
      
      Respond with just one word from the options above.
    `);

    const chain = RunnableSequence.from([
      prompt,
      this.model,
      new StringOutputParser(),
    ]);

    const templateType = await chain.invoke({
      message,
    });

    return templateType.trim().toLowerCase();
  }

  async processMessage(tenantId: string, userId: string, sessionId: string, message: string, context?: any) {
    try {
      // Check if tenant can read and write conversations
      const canRead = await this.policyService.can(tenantId, Action.READ, Resource.CONVERSATIONS);
      const canWrite = await this.policyService.can(tenantId, Action.WRITE, Resource.CONVERSATIONS);

      if (!canRead || !canWrite) {
        throw new UnauthorizedException(`Tenant ${tenantId} is not authorized to process conversations`);
      }

      // Check rate limits
      const withinRateLimit = await this.policyService.checkRateLimit(tenantId, Action.SUGGEST);
      if (!withinRateLimit) {
        throw new UnauthorizedException(`Tenant ${tenantId} has exceeded rate limits`);
      }

      // Get conversation history
      const conversationHistory = await this.getConversationHistory(tenantId, sessionId);

      // Create action context
      const actionContext = {
        tenantId,
        userId,
        locationId: context?.locationId,
        sessionId,
        userPermissions: context?.userPermissions || [],
        businessContext: context?.businessContext,
        conversationHistory,
      };

      // Use decision engine to analyze message and decide on actions
      const decisionResult = await this.decisionEngine.analyzeMessageAndDecide(
        message,
        actionContext,
        conversationHistory
      );

      // Execute actions if any
      let actionResults = [];
      if (decisionResult.actions.length > 0) {
        // Set context for each action
        const actionsWithContext = decisionResult.actions.map(action => ({
          ...action,
          context: actionContext,
        }));

        actionResults = await this.actionExecutor.executeMultipleActions(actionsWithContext);
      }

      // Generate response based on decision level and action results
      const response = await this.generateResponse(message, decisionResult, actionResults, context);

      // Publish user message to Kafka
      await this.publishKafkaEvent(
        tenantId,
        userId,
        sessionId,
        'user.message',
        {
          content: message,
          context,
          decisionResult,
        }
      );

      // Publish assistant response to Kafka
      await this.publishKafkaEvent(
        tenantId,
        userId,
        sessionId,
        'agent.response',
        {
          content: response,
          context: {
            ...context,
            decisionLevel: decisionResult.decisionLevel,
            actionResults,
            metadata: {
              reasoning: decisionResult.reasoning,
              confidence: decisionResult.confidence,
              requiresApproval: decisionResult.requiresHumanInput,
            }
          }
        }
      );

      this.logger.log(`Processed message for tenant ${tenantId} with ${actionResults.length} actions executed`);
      return {
        response,
        decisionLevel: decisionResult.decisionLevel,
        actions: actionResults,
        reasoning: decisionResult.reasoning,
        confidence: decisionResult.confidence,
      };
    } catch (error) {
      this.logger.error(`Error processing message: ${error.message}`);
      throw error;
    }
  }

  async processMessageFromPayload(message: KafkaMessage): Promise<string> {
    try {
      const { content, context } = message.payload;
      
      // Construim prompt-ul pentru model
      const prompt = PromptTemplate.fromTemplate(`
        Context: {context}
        User message: {message}
        
        Please provide a helpful and relevant response. If the message is a greeting, respond appropriately.
        If it's a question, provide a clear and concise answer.
      `);

      // Creăm chain-ul de procesare
      const chain = RunnableSequence.from([
        prompt,
        this.model,
        new StringOutputParser(),
      ]);

      // Procesăm mesajul
      const response = await chain.invoke({
        context: JSON.stringify(context || {}),
        message: content,
      });

      return response;
    } catch (error) {
      this.logger.error(`Error processing message: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async getConversationHistory(tenantId: string, sessionId: string): Promise<any[]> {
    try {
      const messages = await this.conversationsService.getSessionMessages(tenantId, sessionId, 10);
      return messages.map(msg => ({
        role: msg.metadata?.role || 'user',
        content: msg.content,
        timestamp: msg.timestamp,
      }));
    } catch (error) {
      this.logger.warn(`Could not retrieve conversation history: ${error.message}`);
      return [];
    }
  }

  private async generateResponse(
    message: string,
    decisionResult: any,
    actionResults: any[],
    context?: any
  ): Promise<string> {
    const prompt = PromptTemplate.fromTemplate(`
      You are an AI assistant for a business automation system. Generate a natural response based on the following information:

      User Message: {message}
      Decision Level: {decisionLevel}
      Reasoning: {reasoning}
      Actions Executed: {actionResults}
      Context: {context}

      Instructions:
      1. If actions were executed successfully, mention what was done
      2. If approval is required, clearly state what needs approval
      3. If consultation is needed, ask for more information
      4. Keep the response conversational and helpful
      5. If no actions were taken, provide a general helpful response

      Response:
    `);

    const chain = RunnableSequence.from([
      prompt,
      this.model,
      new StringOutputParser(),
    ]);

    const response = await chain.invoke({
      message,
      decisionLevel: decisionResult.decisionLevel,
      reasoning: decisionResult.reasoning,
      actionResults: JSON.stringify(actionResults),
      context: context ? JSON.stringify(context) : 'No additional context',
    });

    return response;
  }
} 