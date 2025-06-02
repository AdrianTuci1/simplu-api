import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum DecisionLevel {
  AUTOMATIC = 'automatic',    // Agent can make decisions without human approval
  SUGGESTION = 'suggestion',  // Agent can suggest but needs human approval
  CONSULTATION = 'consultation' // Agent must ask for human input
}

export interface ResponseTemplate {
  id: string;
  name: string;
  template: string;
  context: string[];
  conditions?: Record<string, any>;
}

export interface DecisionRule {
  action: string;
  resource: string;
  level: DecisionLevel;
  conditions?: Record<string, any>;
}

export interface AgentConfig {
  tenantId: string;
  responseTemplates: ResponseTemplate[];
  decisionRules: DecisionRule[];
  defaultDecisionLevel: DecisionLevel;
  contextRules?: Record<string, any>;
}

@Injectable()
export class AgentConfigService {
  private configs: Map<string, AgentConfig> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeDefaultConfig();
  }

  private initializeDefaultConfig() {
    const defaultConfig: AgentConfig = {
      tenantId: 'default',
      responseTemplates: [
        {
          id: 'greeting',
          name: 'Standard Greeting',
          template: 'Hello! How can I help you today?',
          context: ['initial_contact'],
        },
        {
          id: 'booking_confirmation',
          name: 'Booking Confirmation',
          template: 'I can help you with that booking. Let me check the availability.',
          context: ['booking_request'],
          conditions: {
            requiresApproval: true
          }
        },
        {
          id: 'test_response',
          name: 'Test Message Response',
          template: `Hey there! 👋 I'm your friendly AI assistant, and I'm super excited to chat with you! 
I see you're testing our communication system - that's awesome! I'm here to help and make your experience as smooth as possible. 
What would you like to explore or discuss? I'm ready to assist with anything from simple questions to complex tasks. Just let me know what's on your mind! 😊`,
          context: ['test_message'],
          conditions: {
            requiresApproval: false
          }
        }
      ],
      decisionRules: [
        {
          action: 'read',
          resource: 'conversations',
          level: DecisionLevel.AUTOMATIC
        },
        {
          action: 'write',
          resource: 'conversations',
          level: DecisionLevel.AUTOMATIC
        },
        {
          action: 'create',
          resource: 'reservations',
          level: DecisionLevel.SUGGESTION,
          conditions: {
            maxValue: 1000
          }
        }
      ],
      defaultDecisionLevel: DecisionLevel.CONSULTATION
    };

    this.configs.set('default', defaultConfig);
  }

  async getConfig(tenantId: string): Promise<AgentConfig> {
    const config = this.configs.get(tenantId) || this.configs.get('default');
    if (!config) {
      throw new Error(`No configuration found for tenant ${tenantId} and no default configuration available`);
    }
    return config;
  }

  async setConfig(config: AgentConfig) {
    this.configs.set(config.tenantId, config);
  }

  async getDecisionLevel(tenantId: string, action: string, resource: string): Promise<DecisionLevel> {
    const config = await this.getConfig(tenantId);
    const rule = config.decisionRules.find(
      r => r.action === action && r.resource === resource
    );
    return rule?.level || config.defaultDecisionLevel;
  }

  async getResponseTemplate(tenantId: string, context: string): Promise<ResponseTemplate | null> {
    const config = await this.getConfig(tenantId);
    return config.responseTemplates.find(t => t.context.includes(context)) || null;
  }
} 