import { Injectable, Logger } from '@nestjs/common';
import { 
  WebhookData, 
  AutonomousActionResult
} from './interfaces/agent.interface';
import { MessageDto, AgentResponse } from '@/shared/interfaces/message.interface';
import { BusinessInfoService } from '../business-info/business-info.service';
import { ToolsService } from '../tools/tools.service';
import { SessionService } from '../session/session.service';
import { ToolContext } from '../tools/interfaces';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly businessInfoService: BusinessInfoService,
    private readonly toolsService: ToolsService,
    private readonly sessionService: SessionService,
  ) {
    this.logger.log('🤖 Agent Service starting - AWS Bedrock with Tools Architecture');
  }

  // Process messages from WebSocket (operators)
  async processMessage(data: MessageDto): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      // Get business info to determine businessType
      const businessInfo = await this.businessInfoService.getBusinessInfo(data.businessId);
      
      // Create tool context for Bedrock
      const toolContext: ToolContext = {
        businessType: businessInfo?.businessType || 'dental',
        role: 'operator',
        businessId: data.businessId,
        locationId: data.locationId || 'default',
        userId: data.userId,
        sessionId: data.sessionId || this.generateSessionId(data),
        source: 'websocket',
        view: data.view || {},
      };

      this.logger.log(`📨 Processing operator message for session: ${toolContext.sessionId}`);

      // Retrieve previous Bedrock session state (for multi-turn conversations)
      const previousSessionState = await this.sessionService.getBedrockSessionState(toolContext.sessionId);

      // Invoke Bedrock Agent with the message
      const bedrockResult = await this.toolsService.processMessage(
        data.message,
        toolContext,
        toolContext.sessionId,
        previousSessionState, // Pass previous state for context continuity
      );

      const executionTime = Date.now() - startTime;
      this.logger.log(`✅ Message processed in ${executionTime}ms`);

      if (!bedrockResult.success) {
        this.logger.error(`❌ Bedrock invocation failed: ${bedrockResult.error}`);
        
        return {
          responseId: this.generateResponseId(),
          message: 'Ne pare rău, am întâmpinat o problemă tehnică. Te rugăm să încerci din nou.',
          actions: [],
          timestamp: new Date().toISOString(),
          sessionId: toolContext.sessionId,
        };
      }

      // Save updated session state from Bedrock for next invocation
      if (bedrockResult.sessionState) {
        await this.sessionService.updateBedrockSessionState(
          toolContext.sessionId,
          bedrockResult.sessionState
        );
      }

      return {
        responseId: this.generateResponseId(),
        message: bedrockResult.output.message,
        actions: bedrockResult.output.actions || [],
        timestamp: new Date().toISOString(),
        sessionId: toolContext.sessionId,
        metadata: {
          toolsUsed: bedrockResult.toolsUsed,
          executionTime,
        },
      };
    } catch (error) {
      this.logger.error('❌ Error processing message:', error);
      
      return {
        responseId: this.generateResponseId(),
        message: 'Ne pare rău, am întâmpinat o eroare. Te rugăm să încerci din nou.',
        actions: [],
        timestamp: new Date().toISOString(),
        sessionId: data.sessionId || this.generateSessionId(data),
      };
    }
  }

  // Autonomous processing for webhooks (customers)
  async processWebhookMessage(webhookData: WebhookData): Promise<AutonomousActionResult> {
    const startTime = Date.now();
    
    try {
      // Get business info to determine businessType
      const businessInfo = await this.businessInfoService.getBusinessInfo(webhookData.businessId);
      
      // Create tool context for customer
      const toolContext: ToolContext = {
        businessType: businessInfo?.businessType || 'dental',
        role: 'customer',
        businessId: webhookData.businessId,
        locationId: webhookData.locationId || 'default',
        userId: webhookData.userId,
        sessionId: webhookData.sessionId || this.generateSessionId(webhookData),
        source: 'webhook',
      };

      this.logger.log(`📨 Processing customer webhook message for session: ${toolContext.sessionId}`);

      // Retrieve previous Bedrock session state (for multi-turn conversations)
      const previousSessionState = await this.sessionService.getBedrockSessionState(toolContext.sessionId);

      // Invoke Bedrock Agent with the message
      const bedrockResult = await this.toolsService.processMessage(
        webhookData.message,
        toolContext,
        toolContext.sessionId,
        previousSessionState, // Pass previous state for context continuity
      );

      const executionTime = Date.now() - startTime;
      this.logger.log(`✅ Webhook message processed in ${executionTime}ms`);

      if (!bedrockResult.success) {
        this.logger.error(`❌ Bedrock invocation failed: ${bedrockResult.error}`);
        
        return {
          success: false,
          workflowResults: [{
            step: 1,
            action: 'bedrock_invocation',
            success: false,
            data: { error: bedrockResult.error },
            timestamp: new Date().toISOString()
          }],
          notification: 'A apărut o eroare tehnică',
          shouldRespond: true,
          response: 'Ne pare rău, am întâmpinat o problemă tehnică. Te rugăm să încerci din nou.'
        };
      }

      // Save updated session state from Bedrock for next invocation
      if (bedrockResult.sessionState) {
        await this.sessionService.updateBedrockSessionState(
          toolContext.sessionId,
          bedrockResult.sessionState
        );
      }

      return {
        success: true,
        workflowResults: [{
          step: 1,
          action: 'bedrock_invocation',
          success: true,
          data: {
            toolsUsed: bedrockResult.toolsUsed,
            executionTime,
          },
          timestamp: new Date().toISOString()
        }],
        notification: 'Mesajul a fost procesat cu succes',
        shouldRespond: true,
        response: bedrockResult.output.message
      };
    } catch (error) {
      this.logger.error('❌ Error processing webhook message:', error);
      
      return {
        success: false,
        workflowResults: [{
          step: 1,
          action: 'error_handling',
          success: false,
          data: { error: error.message },
          timestamp: new Date().toISOString()
        }],
        notification: 'A apărut o eroare',
        shouldRespond: true,
        response: 'Ne pare rău, am întâmpinat o eroare. Te rugăm să încerci din nou.'
      };
    }
  }

  // Process webhook through main pipeline (for testing or special cases)
  async processWebhookThroughPipeline(webhookData: WebhookData): Promise<AgentResponse> {
    // Same as processWebhookMessage but returns AgentResponse
    const autonomousResult = await this.processWebhookMessage(webhookData);
    
    return {
      responseId: this.generateResponseId(),
      message: autonomousResult.response || 'Cererea a fost procesată',
      actions: [],
      timestamp: new Date().toISOString(),
      sessionId: webhookData.sessionId || this.generateSessionId(webhookData)
    };
  }

  /**
   * Process frontend response from user actions
   * Frontend sends response → Elixir → AI Agent Server → Continue conversation
   */
  async processFrontendResponse(data: any): Promise<any> {
    const { tenant_id, session_id, function_response } = data;

    this.logger.log(`📥 Received frontend response for session: ${session_id}`);
    this.logger.log(`📋 Function: ${function_response?.functionName}`);
    this.logger.log(`✅ Success: ${function_response?.success}`);

    try {
      // Store the response for the session (could be in memory or DynamoDB)
      // For now, just log it and potentially continue the conversation
      
      if (function_response?.success) {
        this.logger.log(`✅ Frontend action completed successfully`);
        this.logger.log(`📊 Data: ${JSON.stringify(function_response.data)}`);
      } else {
        this.logger.warn(`⚠️ Frontend action failed: ${function_response?.error}`);
      }

      // TODO: Optionally continue conversation with AI based on response
      // Could call processMessage again with context about what happened

      return {
        status: 'ok',
        message: 'Frontend response received and processed',
        sessionId: session_id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to process frontend response:`, error);
      throw error;
    }
  }

  // Generate response ID
  private generateResponseId(): string {
    if (typeof global !== 'undefined' && global.crypto?.randomUUID) {
      return global.crypto.randomUUID();
    }
    return `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate session ID
  private generateSessionId(data: MessageDto | WebhookData): string {
    if (typeof global !== 'undefined' && global.crypto?.randomUUID) {
      return global.crypto.randomUUID();
    }
    return `${data.businessId}:${data.userId}:${Date.now()}`;
  }
}