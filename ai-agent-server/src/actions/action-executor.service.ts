import { Injectable, Logger } from '@nestjs/common';
import { 
  ActionType, 
  ActionRequest, 
  ActionResponse, 
  ActionContext,
  ActionExecutionResult 
} from './action.types';
import { ActionRegistryService } from './action-registry.service';
import { TokenService } from '../token/token.service';
import { TokenOperationType } from '../token/token.entity';
import { EmailService } from '../communications/email/email.service';
import { SMSNotificationService } from '../communications/sms/sms-notification.service';
import { WhatsAppConversationService } from '../communications/whatsapp/whatsapp-conversation.service';
import { TwilioService } from '../communications/twilio/twilio.service';
import { BookingIntegrationService } from '../communications/booking/booking-integration.service';
import { ApiResourceService } from '../resources/api-resource.service';

@Injectable()
export class ActionExecutorService {
  private readonly logger = new Logger(ActionExecutorService.name);

  constructor(
    private actionRegistry: ActionRegistryService,
    private tokenService: TokenService,
    private emailService: EmailService,
    private smsService: SMSNotificationService,
    private whatsappService: WhatsAppConversationService,
    private twilioService: TwilioService,
    private bookingService: BookingIntegrationService,
    private apiResourceService: ApiResourceService,
  ) {}

  async executeAction(actionRequest: ActionRequest): Promise<ActionExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Executing action: ${actionRequest.type}`);
      
      // Validate action
      const actionDef = this.actionRegistry.getActionDefinition(actionRequest.type);
      if (!actionDef) {
        throw new Error(`Unknown action type: ${actionRequest.type}`);
      }

      // Validate parameters
      const validation = this.actionRegistry.validateActionParameters(
        actionRequest.type,
        actionRequest.parameters
      );
      
      if (!validation.valid) {
        throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`);
      }

      // Execute the action based on type
      let result: any;
      
      switch (actionRequest.type) {
        case ActionType.SEND_EMAIL:
          result = await this.executeSendEmail(actionRequest);
          break;
        case ActionType.READ_EMAIL:
          result = await this.executeReadEmail(actionRequest);
          break;
        case ActionType.SEND_SMS:
          result = await this.executeSendSms(actionRequest);
          break;
        case ActionType.SEND_WHATSAPP:
          result = await this.executeSendWhatsapp(actionRequest);
          break;
        case ActionType.MAKE_PHONE_CALL:
          result = await this.executeMakePhoneCall(actionRequest);
          break;
        case ActionType.BOOK_APPOINTMENT:
          result = await this.executeBookAppointment(actionRequest);
          break;
        case ActionType.ANALYZE_DATA:
          result = await this.executeAnalyzeData(actionRequest);
          break;
        case ActionType.CREATE_RESOURCE:
          result = await this.executeCreateResource(actionRequest);
          break;
        case ActionType.READ_RESOURCE:
          result = await this.executeReadResource(actionRequest);
          break;
        case ActionType.UPDATE_RESOURCE:
          result = await this.executeUpdateResource(actionRequest);
          break;
        case ActionType.DELETE_RESOURCE:
          result = await this.executeDeleteResource(actionRequest);
          break;
        case ActionType.LIST_RESOURCES:
          result = await this.executeListResources(actionRequest);
          break;
        case ActionType.REQUEST_HUMAN_APPROVAL:
          result = await this.executeRequestHumanApproval(actionRequest);
          break;
        default:
          throw new Error(`Action type ${actionRequest.type} not implemented`);
      }

      // Calculate execution time
      const executionTime = Date.now() - startTime;
      
      // Get token cost
      const tokenCost = actionDef.tokenCost;
      
      // Use tokens
      const tokenOperationType = this.mapActionToTokenOperation(actionRequest.type);
      const tokenUsed = await this.tokenService.useTokens(
        actionRequest.context.tenantId,
        tokenOperationType,
        actionRequest.context.locationId,
        actionRequest.context.userId,
        actionRequest.context.sessionId,
        `Executed action: ${actionRequest.type}`,
        { parameters: actionRequest.parameters, result }
      );

      return {
        actionType: actionRequest.type,
        success: true,
        result,
        tokensUsed: tokenCost,
        executionTime,
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`Error executing action ${actionRequest.type}: ${error.message}`);
      
      return {
        actionType: actionRequest.type,
        success: false,
        result: null,
        tokensUsed: 0,
        executionTime,
        error: error.message,
      };
    }
  }

  async executeMultipleActions(actions: ActionRequest[]): Promise<ActionExecutionResult[]> {
    const results: ActionExecutionResult[] = [];
    
    for (const action of actions) {
      const result = await this.executeAction(action);
      results.push(result);
      
      // If an action fails, we might want to stop execution
      if (!result.success && action.priority === 'urgent') {
        this.logger.error(`Urgent action failed, stopping execution: ${action.type}`);
        break;
      }
    }
    
    return results;
  }

  private async executeSendEmail(actionRequest: ActionRequest): Promise<any> {
    const { to, subject, body, cc, bcc } = actionRequest.parameters;
    
    return this.emailService.sendEmail(
      actionRequest.context.tenantId,
      to,
      subject,
      body,
      body // Using body as HTML content as well
    );
  }

  private async executeReadEmail(actionRequest: ActionRequest): Promise<any> {
    return this.emailService.readEmails(actionRequest.context.tenantId);
  }

  private async executeSendSms(actionRequest: ActionRequest): Promise<any> {
    const { to, message } = actionRequest.parameters;
    
    // Using a generic SMS sending method - you may need to implement this
    return this.smsService.sendBookingConfirmation(
      actionRequest.context.tenantId,
      {
        customerPhone: to,
        bookingId: 'temp',
        checkIn: new Date(),
        checkOut: new Date(),
        roomType: 'temp'
      }
    );
  }

  private async executeSendWhatsapp(actionRequest: ActionRequest): Promise<any> {
    const { to, message, mediaUrl } = actionRequest.parameters;
    
    return this.whatsappService.handleMessage(
      actionRequest.context.tenantId,
      to,
      message
    );
  }

  private async executeMakePhoneCall(actionRequest: ActionRequest): Promise<any> {
    const { to, script, duration = 300 } = actionRequest.parameters;
    
    // Mock implementation - you'll need to implement actual phone call functionality
    return {
      callId: `call_${Date.now()}`,
      status: 'initiated',
      to,
      script,
      duration
    };
  }

  private async executeBookAppointment(actionRequest: ActionRequest): Promise<any> {
    const { serviceId, dateTime, customerInfo } = actionRequest.parameters;
    
    // Mock implementation - you'll need to implement actual booking functionality
    return {
      bookingId: `booking_${Date.now()}`,
      serviceId,
      dateTime,
      customerInfo,
      status: 'confirmed'
    };
  }

  private async executeAnalyzeData(actionRequest: ActionRequest): Promise<any> {
    const { data, analysisType } = actionRequest.parameters;
    
    // This would integrate with your internal LLM service
    // For now, return a mock analysis
    return {
      analysisType,
      result: `Analysis of ${analysisType} completed for data with ${Object.keys(data).length} fields`,
      insights: ['Sample insight 1', 'Sample insight 2'],
      confidence: 0.85,
    };
  }

  private async executeCreateResource(actionRequest: ActionRequest): Promise<any> {
    const { resourceType, data } = actionRequest.parameters;
    
    return this.apiResourceService.createResource({
      tenantId: actionRequest.context.tenantId,
      userId: actionRequest.context.userId,
      locationId: actionRequest.context.locationId,
      resourceType,
      action: 'create',
      data,
    });
  }

  private async executeReadResource(actionRequest: ActionRequest): Promise<any> {
    const { resourceType, resourceId } = actionRequest.parameters;
    
    return this.apiResourceService.readResource({
      tenantId: actionRequest.context.tenantId,
      userId: actionRequest.context.userId,
      locationId: actionRequest.context.locationId,
      resourceType,
      action: 'read',
      resourceId,
    });
  }

  private async executeUpdateResource(actionRequest: ActionRequest): Promise<any> {
    const { resourceType, resourceId, data } = actionRequest.parameters;
    
    return this.apiResourceService.updateResource({
      tenantId: actionRequest.context.tenantId,
      userId: actionRequest.context.userId,
      locationId: actionRequest.context.locationId,
      resourceType,
      action: 'update',
      resourceId,
      data,
    });
  }

  private async executeDeleteResource(actionRequest: ActionRequest): Promise<any> {
    const { resourceType, resourceId } = actionRequest.parameters;
    
    return this.apiResourceService.deleteResource({
      tenantId: actionRequest.context.tenantId,
      userId: actionRequest.context.userId,
      locationId: actionRequest.context.locationId,
      resourceType,
      action: 'delete',
      resourceId,
    });
  }

  private async executeListResources(actionRequest: ActionRequest): Promise<any> {
    const { resourceType, filters } = actionRequest.parameters;
    
    return this.apiResourceService.listResources({
      tenantId: actionRequest.context.tenantId,
      userId: actionRequest.context.userId,
      locationId: actionRequest.context.locationId,
      resourceType,
      action: 'list',
      filters,
    });
  }

  private async executeRequestHumanApproval(actionRequest: ActionRequest): Promise<any> {
    const { action, reason, data } = actionRequest.parameters;
    
    // This would create an approval request in your system
    // For now, return a mock approval request
    return {
      approvalRequestId: `approval_${Date.now()}`,
      action,
      reason,
      data,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
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
} 