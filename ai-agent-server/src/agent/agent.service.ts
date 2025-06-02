import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { EventsService } from '../events/events.service';
import { PolicyService, Action, Resource } from '../policy/policy.service';
import { AgentConfigService, DecisionLevel } from './config/agent.config';
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

      // Publish user message to Kafka
      await this.publishKafkaEvent(
        tenantId,
        userId,
        sessionId,
        'user.message',
        {
          content: message,
          context
        }
      );

      // Get decision level for this interaction
      const decisionLevel = await this.agentConfigService.getDecisionLevel(
        tenantId,
        Action.WRITE,
        Resource.CONVERSATIONS
      );

      // Get appropriate response template based on context
      const responseTemplate = await this.agentConfigService.getResponseTemplate(
        tenantId,
        context?.type || 'general'
      );

      // Construim prompt-ul pentru model folosind template-ul
      const prompt = PromptTemplate.fromTemplate(
        `You are an AI assistant for tenant {tenantId}. 
        
        Context: {context}
        User message: {message}
        
        Please respond in a friendly and engaging way, similar to this example:
        {template}
        
        Your response should be natural and conversational, while maintaining professionalism.
        If the decision level is 'consultation', make sure to ask for human input before making important decisions.
        
        Now, please provide your response to the user's message:`
      );

      const chain = RunnableSequence.from([
        prompt,
        this.model,
        new StringOutputParser(),
      ]);

      const response = await chain.invoke({
        tenantId,
        message,
        context: context ? JSON.stringify(context) : 'No context provided',
        template: responseTemplate?.template || 'No specific template',
      });

      // If decision level is suggestion or consultation, mark the response accordingly
      const finalResponse = decisionLevel !== DecisionLevel.AUTOMATIC
        ? `[${decisionLevel.toUpperCase()}] ${response}`
        : response;

      // Publish assistant response to Kafka
      await this.publishKafkaEvent(
        tenantId,
        userId,
        sessionId,
        'agent.response',
        {
          content: finalResponse,
          context: {
            ...context,
            decisionLevel,
            metadata: {
              template: responseTemplate?.id,
              requiresApproval: decisionLevel !== DecisionLevel.AUTOMATIC
            }
          }
        }
      );

      this.logger.log(`Processed message for tenant ${tenantId}`);
      return finalResponse;
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
} 