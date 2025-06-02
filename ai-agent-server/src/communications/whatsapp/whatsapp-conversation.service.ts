import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommunicationConfigService } from '../services/communication-config.service';
import { TwilioService } from '../twilio/twilio.service';
import { ChatOpenAI } from '@langchain/openai';
import { RunnableSequence } from '@langchain/core/runnables';
import { PromptTemplate } from '@langchain/core/prompts';

type ConversationState = 'greeting' | 'booking' | 'support' | 'end';

@Injectable()
export class WhatsAppConversationService {
  private conversationStates: Map<string, {
    state: ConversationState;
    context: any;
  }> = new Map();

  constructor(
    private configService: ConfigService,
    private communicationConfigService: CommunicationConfigService,
    private twilioService: TwilioService,
  ) {}

  async initializeConversation(tenantId: string, phoneNumber: string) {
    const conversationId = `${tenantId}-${phoneNumber}`;
    this.conversationStates.set(conversationId, {
      state: 'greeting',
      context: {},
    });
    return conversationId;
  }

  async handleMessage(tenantId: string, phoneNumber: string, message: string) {
    const conversationId = `${tenantId}-${phoneNumber}`;
    let state = this.conversationStates.get(conversationId);

    // Initialize conversation if it doesn't exist
    if (!state) {
      await this.initializeConversation(tenantId, phoneNumber);
      state = this.conversationStates.get(conversationId);
      if (!state) {
        throw new Error('Failed to initialize conversation state');
      }
    }

    const config = await this.communicationConfigService.getConfig(tenantId);
    const llm = new ChatOpenAI({
      openAIApiKey: config.openai.apiKey,
      modelName: 'gpt-4',
    });

    // Process message based on current state
    let result;
    const currentState = state.state;
    switch (currentState) {
      case 'greeting':
        result = await this.processGreeting(llm, message);
        state.state = message.toLowerCase().includes('booking') ? 'booking' : 'support';
        break;
      case 'booking':
        result = await this.processBooking(llm, message);
        state.state = 'end';
        break;
      case 'support':
        result = await this.processSupport(llm, message);
        state.state = 'end';
        break;
      default:
        result = { content: 'Thank you for your message. How can I help you?' };
        state.state = 'greeting';
    }

    // Update state
    state.context = {
      ...state.context,
      lastMessage: message,
      lastResponse: result,
    };
    this.conversationStates.set(conversationId, state);

    // Send response via WhatsApp
    await this.twilioService.sendWhatsAppMessage(
      tenantId,
      phoneNumber,
      result.content,
      config
    );

    return result;
  }

  private async processGreeting(llm: ChatOpenAI, message: string) {
    const greetingNode = RunnableSequence.from([
      PromptTemplate.fromTemplate(
        'You are a helpful hotel assistant. The guest says: {message}\nRespond in a friendly way:'
      ),
      llm,
    ]);

    return greetingNode.invoke({ message });
  }

  private async processBooking(llm: ChatOpenAI, message: string) {
    const bookingNode = RunnableSequence.from([
      PromptTemplate.fromTemplate(
        'The guest wants to make a booking. Their message: {message}\nExtract booking details and respond:'
      ),
      llm,
    ]);

    return bookingNode.invoke({ message });
  }

  private async processSupport(llm: ChatOpenAI, message: string) {
    const supportNode = RunnableSequence.from([
      PromptTemplate.fromTemplate(
        'The guest needs support. Their message: {message}\nProvide helpful support:'
      ),
      llm,
    ]);

    return supportNode.invoke({ message });
  }

  async endConversation(tenantId: string, phoneNumber: string) {
    const conversationId = `${tenantId}-${phoneNumber}`;
    this.conversationStates.delete(conversationId);
  }
} 