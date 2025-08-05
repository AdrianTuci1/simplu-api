import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ElixirHttpService } from '../websocket/elixir-http.service';

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

@Controller('api/messages')
export class MessagesController {
  private readonly logger = new Logger(MessagesController.name);

  constructor(private readonly elixirHttpService: ElixirHttpService) {}

  @Post()
  async handleMessage(@Body() messageRequest: MessageRequest) {
    this.logger.log(`Received message from Notification Hub: ${JSON.stringify(messageRequest)}`);

    try {
      // Procesează mesajul cu AI (aici ar fi logica AI)
      const aiResponse = await this.processWithAI(messageRequest.payload.content);

      // Trimite răspunsul înapoi la Notification Hub
      await this.elixirHttpService.sendAIResponse(
        messageRequest.tenant_id,
        messageRequest.user_id,
        messageRequest.session_id,
        messageRequest.message_id,
        aiResponse,
        messageRequest.payload.context || {}
      );

      return {
        status: 'success',
        message: 'Message processed and response sent'
      };
    } catch (error) {
      this.logger.error(`Error processing message: ${error.message}`);
      return {
        status: 'error',
        message: 'Failed to process message'
      };
    }
  }

  private async processWithAI(content: string): Promise<string> {
    // Simulare procesare AI - aici ar fi integrarea cu OpenRouter sau alt serviciu AI
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulare delay
    
    return `AI Response to: "${content}". This is a simulated response from the AI agent.`;
  }
}