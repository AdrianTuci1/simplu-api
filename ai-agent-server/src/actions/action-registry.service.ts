import { Injectable } from '@nestjs/common';
import { 
  ActionType, 
  ActionCategory, 
  ActionDefinition, 
  DecisionLevel,
  ActionParameter 
} from './action.types';

@Injectable()
export class ActionRegistryService {
  private readonly actionDefinitions: Map<ActionType, ActionDefinition> = new Map();

  constructor() {
    this.registerDefaultActions();
  }

  private registerDefaultActions() {
    // Communication Actions
    this.registerAction({
      type: ActionType.SEND_EMAIL,
      category: ActionCategory.COMMUNICATION,
      name: 'Send Email',
      description: 'Send an email to a recipient',
      requiredPermissions: ['email:send'],
      tokenCost: 1,
      defaultDecisionLevel: DecisionLevel.AUTOMATIC,
      parameters: [
        { name: 'to', type: 'string', required: true, description: 'Recipient email address' },
        { name: 'subject', type: 'string', required: true, description: 'Email subject' },
        { name: 'body', type: 'string', required: true, description: 'Email body content' },
        { name: 'cc', type: 'array', required: false, description: 'CC recipients' },
        { name: 'bcc', type: 'array', required: false, description: 'BCC recipients' },
      ],
    });

    this.registerAction({
      type: ActionType.READ_EMAIL,
      category: ActionCategory.COMMUNICATION,
      name: 'Read Email',
      description: 'Read emails from inbox',
      requiredPermissions: ['email:read'],
      tokenCost: 1,
      defaultDecisionLevel: DecisionLevel.AUTOMATIC,
      parameters: [
        { name: 'limit', type: 'number', required: false, defaultValue: 10, description: 'Number of emails to read' },
        { name: 'folder', type: 'string', required: false, defaultValue: 'INBOX', description: 'Email folder to read from' },
      ],
    });

    this.registerAction({
      type: ActionType.SEND_SMS,
      category: ActionCategory.COMMUNICATION,
      name: 'Send SMS',
      description: 'Send an SMS message',
      requiredPermissions: ['sms:send'],
      tokenCost: 1,
      defaultDecisionLevel: DecisionLevel.AUTOMATIC,
      parameters: [
        { name: 'to', type: 'string', required: true, description: 'Recipient phone number' },
        { name: 'message', type: 'string', required: true, description: 'SMS message content' },
      ],
    });

    this.registerAction({
      type: ActionType.SEND_WHATSAPP,
      category: ActionCategory.COMMUNICATION,
      name: 'Send WhatsApp Message',
      description: 'Send a WhatsApp message',
      requiredPermissions: ['whatsapp:send'],
      tokenCost: 10,
      defaultDecisionLevel: DecisionLevel.AUTOMATIC,
      parameters: [
        { name: 'to', type: 'string', required: true, description: 'Recipient phone number' },
        { name: 'message', type: 'string', required: true, description: 'WhatsApp message content' },
        { name: 'mediaUrl', type: 'string', required: false, description: 'URL of media to send' },
      ],
    });

    this.registerAction({
      type: ActionType.MAKE_PHONE_CALL,
      category: ActionCategory.COMMUNICATION,
      name: 'Make Phone Call',
      description: 'Make a phone call using ElevenLabs',
      requiredPermissions: ['phone:call'],
      tokenCost: 50,
      defaultDecisionLevel: DecisionLevel.CONSULTATION,
      parameters: [
        { name: 'to', type: 'string', required: true, description: 'Recipient phone number' },
        { name: 'script', type: 'string', required: true, description: 'Call script for the agent' },
        { name: 'duration', type: 'number', required: false, defaultValue: 300, description: 'Maximum call duration in seconds' },
      ],
      isAsync: true,
    });

    // Resource Management Actions
    this.registerAction({
      type: ActionType.CREATE_RESOURCE,
      category: ActionCategory.RESOURCE_MANAGEMENT,
      name: 'Create Resource',
      description: 'Create a new resource in the system',
      requiredPermissions: ['resource:create'],
      tokenCost: 1,
      defaultDecisionLevel: DecisionLevel.SUGGESTION,
      parameters: [
        { name: 'resourceType', type: 'string', required: true, description: 'Type of resource to create' },
        { name: 'data', type: 'object', required: true, description: 'Resource data' },
      ],
    });

    this.registerAction({
      type: ActionType.READ_RESOURCE,
      category: ActionCategory.RESOURCE_MANAGEMENT,
      name: 'Read Resource',
      description: 'Read a resource from the system',
      requiredPermissions: ['resource:read'],
      tokenCost: 1,
      defaultDecisionLevel: DecisionLevel.AUTOMATIC,
      parameters: [
        { name: 'resourceType', type: 'string', required: true, description: 'Type of resource to read' },
        { name: 'resourceId', type: 'string', required: true, description: 'Resource ID' },
      ],
    });

    this.registerAction({
      type: ActionType.UPDATE_RESOURCE,
      category: ActionCategory.RESOURCE_MANAGEMENT,
      name: 'Update Resource',
      description: 'Update an existing resource',
      requiredPermissions: ['resource:update'],
      tokenCost: 1,
      defaultDecisionLevel: DecisionLevel.SUGGESTION,
      parameters: [
        { name: 'resourceType', type: 'string', required: true, description: 'Type of resource to update' },
        { name: 'resourceId', type: 'string', required: true, description: 'Resource ID' },
        { name: 'data', type: 'object', required: true, description: 'Updated resource data' },
      ],
    });

    // External Service Actions
    this.registerAction({
      type: ActionType.BOOK_APPOINTMENT,
      category: ActionCategory.EXTERNAL_SERVICE,
      name: 'Book Appointment',
      description: 'Book an appointment with external service',
      requiredPermissions: ['booking:create'],
      tokenCost: 5,
      defaultDecisionLevel: DecisionLevel.CONSULTATION,
      parameters: [
        { name: 'serviceId', type: 'string', required: true, description: 'Service ID to book' },
        { name: 'dateTime', type: 'string', required: true, description: 'Appointment date and time' },
        { name: 'customerInfo', type: 'object', required: true, description: 'Customer information' },
      ],
    });

    // Internal API Actions
    this.registerAction({
      type: ActionType.ANALYZE_DATA,
      category: ActionCategory.INTERNAL_API,
      name: 'Analyze Data',
      description: 'Analyze data using internal LLM',
      requiredPermissions: ['data:analyze'],
      tokenCost: 1,
      defaultDecisionLevel: DecisionLevel.AUTOMATIC,
      parameters: [
        { name: 'data', type: 'object', required: true, description: 'Data to analyze' },
        { name: 'analysisType', type: 'string', required: true, description: 'Type of analysis to perform' },
      ],
    });

    // Coordination Actions
    this.registerAction({
      type: ActionType.REQUEST_HUMAN_APPROVAL,
      category: ActionCategory.COORDINATION,
      name: 'Request Human Approval',
      description: 'Request approval from human coordinator',
      requiredPermissions: ['approval:request'],
      tokenCost: 0,
      defaultDecisionLevel: DecisionLevel.APPROVAL_REQUIRED,
      parameters: [
        { name: 'action', type: 'string', required: true, description: 'Action requiring approval' },
        { name: 'reason', type: 'string', required: true, description: 'Reason for approval request' },
        { name: 'data', type: 'object', required: false, description: 'Additional data for approval' },
      ],
      requiresApproval: true,
    });
  }

  registerAction(definition: ActionDefinition) {
    this.actionDefinitions.set(definition.type, definition);
  }

  getActionDefinition(type: ActionType): ActionDefinition | undefined {
    return this.actionDefinitions.get(type);
  }

  getAllActions(): ActionDefinition[] {
    return Array.from(this.actionDefinitions.values());
  }

  getActionsByCategory(category: ActionCategory): ActionDefinition[] {
    return this.getAllActions().filter(action => action.category === category);
  }

  getActionsByPermission(permission: string): ActionDefinition[] {
    return this.getAllActions().filter(action => 
      action.requiredPermissions.includes(permission)
    );
  }

  validateActionParameters(type: ActionType, parameters: Record<string, any>): { valid: boolean; errors: string[] } {
    const definition = this.getActionDefinition(type);
    if (!definition) {
      return { valid: false, errors: ['Action type not found'] };
    }

    const errors: string[] = [];

    // Check required parameters
    for (const param of definition.parameters) {
      if (param.required && !(param.name in parameters)) {
        errors.push(`Missing required parameter: ${param.name}`);
      }
    }

    // Check parameter types
    for (const [name, value] of Object.entries(parameters)) {
      const paramDef = definition.parameters.find(p => p.name === name);
      if (paramDef) {
        const expectedType = paramDef.type;
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        
        if (expectedType === 'object' && actualType !== 'object') {
          errors.push(`Parameter ${name} should be an object, got ${actualType}`);
        } else if (expectedType === 'array' && actualType !== 'array') {
          errors.push(`Parameter ${name} should be an array, got ${actualType}`);
        } else if (['string', 'number', 'boolean'].includes(expectedType) && actualType !== expectedType) {
          errors.push(`Parameter ${name} should be ${expectedType}, got ${actualType}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
} 