import { Injectable } from '@nestjs/common';
import { 
  WebhookData, 
  AutonomousActionResult
} from './interfaces/agent.interface';
import { MessageDto, AgentResponse } from '@/shared/interfaces/message.interface';
import { SimplifiedRagService, RagContext } from './rag/simplified-rag.service';
import { ResourceRagService, ResourceRagContext } from './rag/resource-rag.service';
import { BusinessInfoService, BusinessInfo } from '../business-info/business-info.service';

@Injectable()
export class AgentService {
  constructor(
    private readonly simplifiedRagService: SimplifiedRagService,
    private readonly resourceRagService: ResourceRagService,
    private readonly businessInfoService: BusinessInfoService
  ) {
    console.log('🚀 Simplified Agent Service starting - using RAG-based routing');
  }

  // Process messages from WebSocket (operators)
  async processMessage(data: MessageDto): Promise<AgentResponse> {
    // Get business info to determine businessType
    const businessInfo = await this.businessInfoService.getBusinessInfo(data.businessId);
    
    // Create RAG context
    const ragContext: RagContext = {
      businessType: businessInfo?.businessType || 'dental',
      role: 'operator',
      businessId: data.businessId,
      locationId: data.locationId || 'default',
      userId: data.userId,
      message: data.message,
      sessionId: data.sessionId || this.generateSessionId(data),
      source: 'websocket'
    };

    // Get RAG result for operator + businessType
    const ragResult = await this.simplifiedRagService.getRagForRoleAndBusiness(
      ragContext.businessType,
      ragContext.role,
      ragContext
    );

    // Check if message is asking for specific resources
    const resourceRequest = this.detectResourceRequest(data.message, ragContext.businessType);
    if (resourceRequest) {
      const resourceRagResult = await this.resourceRagService.getResourceRag(
        ragContext.businessType,
        resourceRequest,
        {
          businessType: ragContext.businessType,
          resourceType: resourceRequest,
          businessId: ragContext.businessId,
          locationId: ragContext.locationId,
          userId: ragContext.userId,
          message: ragContext.message,
          sessionId: ragContext.sessionId
        }
      );

      return {
        responseId: this.generateResponseId(),
        message: resourceRagResult.response,
        actions: resourceRagResult.actions,
        timestamp: new Date().toISOString(),
        sessionId: ragContext.sessionId,
        ragContext: {
          type: 'resource',
          key: resourceRagResult.resourceKey,
          data: resourceRagResult.data
        }
      };
    }

    return {
      responseId: this.generateResponseId(),
      message: ragResult.response,
      actions: this.generateActionsFromRag(ragResult),
      timestamp: new Date().toISOString(),
      sessionId: ragContext.sessionId,
      ragContext: {
        type: 'general',
        key: `${ragContext.role}.${ragContext.businessType}.general`,
        data: ragResult.context
      }
    };
  }

  // Autonomous processing for webhooks (customers)
  async processWebhookMessage(webhookData: WebhookData): Promise<AutonomousActionResult> {
    // Get business info to determine businessType
    const businessInfo = await this.businessInfoService.getBusinessInfo(webhookData.businessId);
    
    // Create RAG context for customer
    const ragContext: RagContext = {
      businessType: businessInfo?.businessType || 'dental',
      role: 'customer',
      businessId: webhookData.businessId,
      locationId: webhookData.locationId || 'default',
      userId: webhookData.userId,
      message: webhookData.message,
      sessionId: webhookData.sessionId || this.generateSessionId(webhookData),
      source: 'webhook'
    };

    // Get RAG result for customer + businessType
    const ragResult = await this.simplifiedRagService.getRagForRoleAndBusiness(
      ragContext.businessType,
      ragContext.role,
      ragContext
    );

    // Check if customer is asking for specific resources
    const resourceRequest = this.detectResourceRequest(webhookData.message, ragContext.businessType);
    if (resourceRequest) {
      const resourceRagResult = await this.resourceRagService.getResourceRag(
        ragContext.businessType,
        resourceRequest,
        {
          businessType: ragContext.businessType,
          resourceType: resourceRequest,
          businessId: ragContext.businessId,
          locationId: ragContext.locationId,
          userId: ragContext.userId,
          message: ragContext.message,
          sessionId: ragContext.sessionId
        }
      );

      return {
        success: true,
        workflowResults: [{
          step: 1,
          action: 'resource_query',
          success: true,
          data: resourceRagResult.data,
          timestamp: new Date().toISOString()
        }],
        notification: `Resursa ${resourceRequest} a fost procesată cu succes`,
        shouldRespond: true,
        response: resourceRagResult.response
      };
    }

    return {
      success: true,
      workflowResults: [{
        step: 1,
        action: 'general_query',
        success: true,
        data: ragResult.context,
        timestamp: new Date().toISOString()
      }],
      notification: 'Cererea a fost procesată cu succes',
      shouldRespond: true,
      response: ragResult.response
    };
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

  // Detect if message is asking for specific resources
  private detectResourceRequest(message: string, businessType: string): string | null {
    const lowerMessage = message.toLowerCase();
    
    // Resource keywords mapping
    const resourceKeywords: Record<string, Record<string, string[]>> = {
      'dental': {
        'listResources': ['servicii', 'doctori', 'echipamente', 'resurse', 'lista'],
        'appointment': ['programare', 'programări', 'program', 'data', 'ora'],
        'patient': ['pacient', 'pacienți', 'client', 'clienți', 'date pacient'],
        'treatments': ['tratamente', 'tratament', 'servicii medicale', 'prețuri']
      },
      'gym': {
        'listResources': ['clase', 'echipamente', 'antrenori', 'resurse', 'lista'],
        'membership': ['abonament', 'abonamente', 'membru', 'membri'],
        'classes': ['clase', 'antrenamente', 'yoga', 'pilates'],
        'equipment': ['echipamente', 'treadmill', 'gantere', 'aparate']
      },
      'hotel': {
        'listResources': ['camere', 'servicii', 'facilități', 'resurse', 'lista'],
        'booking': ['rezervare', 'rezervări', 'camera', 'check-in'],
        'rooms': ['camere', 'tipuri camere', 'disponibilitate'],
        'services': ['servicii', 'facilități', 'wi-fi', 'parcare']
      }
    };

    const businessKeywords = resourceKeywords[businessType] || {};
    
    for (const [resourceType, keywords] of Object.entries(businessKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return resourceType;
      }
    }

    return null;
  }

  // Generate actions from RAG result
  private generateActionsFromRag(ragResult: any): any[] {
    const actions = [];
    
    // Add general actions based on available resources
    if (ragResult.resources && ragResult.resources.length > 0) {
      actions.push({
        type: 'view_resources',
        title: 'Vezi resursele disponibile',
        data: ragResult.resources
      });
    }

    // Add specific actions based on business type and role
    if (ragResult.context.role === 'operator') {
      actions.push({
        type: 'create_resource',
        title: 'Creează resursă nouă',
        data: {}
      });
    } else {
      actions.push({
        type: 'request_info',
        title: 'Solicită informații',
        data: {}
      });
    }

    return actions;
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