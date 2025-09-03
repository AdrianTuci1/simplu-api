import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ElixirHttpService } from '../websocket/elixir-http.service';
import { AgentService } from '../agent/agent.service';
import { MessageDto } from '@/shared/interfaces/message.interface';

interface MessageRequest {
  tenant_id: string;
  user_id: string;
  session_id: string;
  message_id: string;
  payload: {
    content: string;
    context?: any;
  };
  timestamp: string;
}

interface AIResponse {
  content: string;
  intent: string;
  confidence: number;
  entities: any[];
  suggestedActions: string[];
  context: any;
}

@Controller('api/messages')
export class MessagesController {
  private readonly logger = new Logger(MessagesController.name);

  constructor(
    private readonly elixirHttpService: ElixirHttpService,
    private readonly agentService: AgentService
  ) {}

  @Post()
  async handleMessage(@Body() messageRequest: MessageRequest) {
    this.logger.log('=== Processing Message from Notification Hub ===');
    this.logger.log(`Message ID: ${messageRequest.message_id}`);
    this.logger.log(`Tenant ID: ${messageRequest.tenant_id}`);
    this.logger.log(`User ID: ${messageRequest.user_id}`);
    this.logger.log(`Session ID: ${messageRequest.session_id}`);
    this.logger.log(`Timestamp: ${messageRequest.timestamp}`);
    this.logger.log(`Content: "${messageRequest.payload.content}"`);
    this.logger.log(`Context: ${JSON.stringify(messageRequest.payload.context)}`);

    try {
      // Procesează mesajul cu AI și detectează intenția
      this.logger.log('Starting AI processing with LLM...');
      const aiResponse = await this.processWithAI(
        messageRequest.payload.content,
        messageRequest.payload.context || {}
      );

      this.logger.log('=== AI Processing Results ===');
      this.logger.log(`Detected Intent: ${aiResponse.intent}`);
      this.logger.log(`Confidence: ${aiResponse.confidence}`);
      this.logger.log(`Entities: ${JSON.stringify(aiResponse.entities)}`);
      this.logger.log(`Suggested Actions: ${JSON.stringify(aiResponse.suggestedActions)}`);
      this.logger.log(`Response Content: "${aiResponse.content}"`);

      // Trimite răspunsul înapoi la Notification Hub
      this.logger.log('Sending AI response back to Notification Hub...');
      await this.elixirHttpService.sendAIResponse(
        messageRequest.tenant_id,
        messageRequest.user_id,
        messageRequest.session_id,
        messageRequest.message_id,
        aiResponse.content,
        {
          ...messageRequest.payload.context,
          intent: aiResponse.intent,
          confidence: aiResponse.confidence,
          entities: aiResponse.entities,
          suggestedActions: aiResponse.suggestedActions,
          aiProcessing: true
        }
      );

      this.logger.log('=== Message Processing Completed Successfully ===');
      this.logger.log(`Response sent for message: ${messageRequest.message_id}`);

      return {
        status: 'success',
        message: 'Message processed and response sent',
        data: {
          messageId: messageRequest.message_id,
          intent: aiResponse.intent,
          confidence: aiResponse.confidence,
          processingTime: Date.now() - new Date(messageRequest.timestamp).getTime()
        }
      };
    } catch (error) {
      this.logger.error('=== Error Processing Message ===');
      this.logger.error(`Message ID: ${messageRequest.message_id}`);
      this.logger.error(`Error: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);
      
      return {
        status: 'error',
        message: 'Failed to process message',
        error: error.message
      };
    }
  }

  private async processWithAI(content: string, context: any): Promise<AIResponse> {
    this.logger.log('=== LLM Processing Started ===');
    this.logger.log(`Input content: "${content}"`);
    this.logger.log(`Context: ${JSON.stringify(context)}`);

    try {
      // Folosește AgentService pentru procesarea LLM
      this.logger.log('Calling AgentService for LLM processing...');
      
      // Creează MessageDto din parametrii disponibili
      const messageData: MessageDto = {
        businessId: context.tenant_id || context.businessId || 'default',
        locationId: context.locationId || 'default',
        userId: context.user_id || context.userId || 'default',
        message: content,
        sessionId: context.session_id || context.sessionId,
        timestamp: new Date().toISOString()
      };
      
      const llmResponse = await this.agentService.processMessage(messageData);
      
      this.logger.log('=== LLM Response Received ===');
      this.logger.log(`Raw LLM response: ${JSON.stringify(llmResponse)}`);

      // Parsează răspunsul LLM pentru a extrage intenția și entitățile
      const parsedResponse = this.parseLLMResponse(llmResponse, content);
      
      this.logger.log('=== Parsed LLM Response ===');
      this.logger.log(`Intent: ${parsedResponse.intent}`);
      this.logger.log(`Confidence: ${parsedResponse.confidence}`);
      this.logger.log(`Entities: ${JSON.stringify(parsedResponse.entities)}`);

      return parsedResponse;
    } catch (error) {
      this.logger.error('=== LLM Processing Error ===');
      this.logger.error(`Error: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);
      
      // Fallback response în caz de eroare
      return {
        content: `Îmi pare rău, am întâmpinat o problemă tehnica. Mesajul tău: "${content}"`,
        intent: 'error',
        confidence: 0.0,
        entities: [],
        suggestedActions: ['Retry', 'Contact Support'],
        context: context
      };
    }
  }

  private parseLLMResponse(llmResponse: any, originalContent: string): AIResponse {
    this.logger.log('=== Parsing LLM Response ===');
    this.logger.log(`LLM Response: ${JSON.stringify(llmResponse)}`);

    try {
      // Încearcă să parsezi răspunsul JSON
      let parsed: any;
      if (typeof llmResponse === 'string') {
        parsed = JSON.parse(llmResponse);
      } else {
        parsed = llmResponse;
      }

      this.logger.log(`Parsed JSON: ${JSON.stringify(parsed)}`);

      return {
        content: parsed.content || parsed.response || parsed.message || `Răspuns la: "${originalContent}"`,
        intent: parsed.intent || this.detectIntentFromContent(originalContent),
        confidence: parsed.confidence || 0.8,
        entities: parsed.entities || this.extractEntities(originalContent),
        suggestedActions: parsed.suggestedActions || this.generateSuggestedActions(parsed.intent),
        context: parsed.context || {}
      };
    } catch (parseError) {
      this.logger.warn('=== LLM Response Parse Error, Using Fallback ===');
      this.logger.warn(`Parse error: ${parseError.message}`);
      this.logger.warn(`Raw response: ${JSON.stringify(llmResponse)}`);

      // Fallback parsing
      return {
        content: llmResponse.content || llmResponse.response || llmResponse.message || `Răspuns la: "${originalContent}"`,
        intent: this.detectIntentFromContent(originalContent),
        confidence: 0.6,
        entities: this.extractEntities(originalContent),
        suggestedActions: this.generateSuggestedActions('general_inquiry'),
        context: {}
      };
    }
  }

  private detectIntentFromContent(content: string): string {
    this.logger.log(`Detecting intent from content: "${content}"`);
    
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('salut') || lowerContent.includes('bună') || lowerContent.includes('hello')) {
      return 'greeting';
    } else if (lowerContent.includes('ajuta') || lowerContent.includes('ajutor') || lowerContent.includes('help')) {
      return 'help_request';
    } else if (lowerContent.includes('rezervare') || lowerContent.includes('booking') || lowerContent.includes('appointment')) {
      return 'booking_request';
    } else if (lowerContent.includes('informații') || lowerContent.includes('info') || lowerContent.includes('details')) {
      return 'information_request';
    } else if (lowerContent.includes('mulțumesc') || lowerContent.includes('thanks') || lowerContent.includes('thank you')) {
      return 'gratitude';
    } else if (lowerContent.includes('problemă') || lowerContent.includes('issue') || lowerContent.includes('error')) {
      return 'problem_report';
    } else {
      return 'general_inquiry';
    }
  }

  private extractEntities(content: string): any[] {
    this.logger.log(`Extracting entities from content: "${content}"`);
    
    const entities = [];
    const lowerContent = content.toLowerCase();
    
    // Detectează entități simple
    if (lowerContent.includes('rezervare')) entities.push({ type: 'service', value: 'rezervare' });
    if (lowerContent.includes('programare')) entities.push({ type: 'service', value: 'programare' });
    if (lowerContent.includes('consult')) entities.push({ type: 'service', value: 'consult' });
    if (lowerContent.includes('urgent')) entities.push({ type: 'priority', value: 'urgent' });
    if (lowerContent.includes('important')) entities.push({ type: 'priority', value: 'important' });
    
    return entities;
  }

  private generateSuggestedActions(intent: string): string[] {
    this.logger.log(`Generating suggested actions for intent: ${intent}`);
    
    switch (intent) {
      case 'greeting':
        return ['View Services', 'Make Appointment', 'Get Information'];
      case 'help_request':
        return ['Browse Services', 'Contact Support', 'FAQ'];
      case 'booking_request':
        return ['Select Date', 'Choose Service', 'View Availability'];
      case 'information_request':
        return ['Service Details', 'Pricing', 'Location'];
      case 'gratitude':
        return ['Continue Chat', 'Make Appointment', 'Leave Review'];
      case 'problem_report':
        return ['Contact Support', 'Report Issue', 'Get Help'];
      default:
        return ['Get Help', 'Browse Services', 'Contact Us'];
    }
  }
}