import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum DecisionLevel {
  AUTOMATIC = 'automatic',    // Agent can make decisions without human approval
  SUGGESTION = 'suggestion',  // Agent can suggest but needs human approval
  CONSULTATION = 'consultation' // Agent must ask for human input
}

export enum BusinessType {
  HOTEL = 'hotel',
  RESTAURANT = 'restaurant',
  CLINIC = 'clinic',
  RETAIL = 'retail',
  SERVICE = 'service',
  OTHER = 'other'
}

export interface BusinessInfo {
  type: BusinessType;
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  workingHours: {
    [key: string]: { // 'monday', 'tuesday', etc.
      open: string;  // '09:00'
      close: string; // '17:00'
      isOpen: boolean;
    };
  };
  services: string[];
  languages: string[];
  paymentMethods: string[];
  specialFeatures?: string[];
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
  businessInfo: BusinessInfo;
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
      businessInfo: {
        type: BusinessType.OTHER,
        name: 'Default Business',
        description: 'A default business configuration',
        address: {
          street: '',
          city: '',
          state: '',
          country: '',
          postalCode: ''
        },
        contact: {
          phone: '',
          email: '',
          website: ''
        },
        workingHours: {
          monday: { open: '09:00', close: '17:00', isOpen: true },
          tuesday: { open: '09:00', close: '17:00', isOpen: true },
          wednesday: { open: '09:00', close: '17:00', isOpen: true },
          thursday: { open: '09:00', close: '17:00', isOpen: true },
          friday: { open: '09:00', close: '17:00', isOpen: true },
          saturday: { open: '10:00', close: '14:00', isOpen: true },
          sunday: { open: '10:00', close: '14:00', isOpen: false }
        },
        services: [],
        languages: ['en'],
        paymentMethods: []
      },
      responseTemplates: [
        {
          id: 'greeting',
          name: 'Standard Greeting',
          template: `Hello! 👋 I'm your friendly AI assistant. I'm here to help you with any questions or tasks you might have. How can I assist you today?`,
          context: ['initial_contact', 'greeting'],
        },
        {
          id: 'question',
          name: 'General Question',
          template: `I understand you have a question. Let me help you with that. I'll do my best to provide a clear and accurate answer.`,
          context: ['question', 'inquiry'],
        },
        {
          id: 'complaint',
          name: 'Complaint Handling',
          template: `I'm sorry to hear about your experience. I understand this is frustrating, and I want to help resolve this situation. Could you please provide more details so I can better assist you?`,
          context: ['complaint', 'issue', 'problem'],
        },
        {
          id: 'request',
          name: 'Service Request',
          template: `I'll help you with your request. To ensure I provide the best possible assistance, could you please provide any specific details or requirements you have in mind?`,
          context: ['request', 'service', 'help'],
        },
        {
          id: 'feedback',
          name: 'Feedback Response',
          template: `Thank you for sharing your feedback! Your input is valuable to us and helps us improve our services. We appreciate you taking the time to share your thoughts.`,
          context: ['feedback', 'suggestion', 'review'],
        },
        {
          id: 'booking_confirmation',
          name: 'Booking Confirmation',
          template: `I can help you with that booking. Let me check the availability and guide you through the process. Could you please provide the dates and any specific preferences you have?`,
          context: ['booking_request', 'reservation'],
          conditions: {
            requiresApproval: true
          }
        },
        {
          id: 'technical_support',
          name: 'Technical Support',
          template: `I understand you're experiencing a technical issue. Let's troubleshoot this together. Could you please describe the problem you're encountering and any error messages you're seeing?`,
          context: ['technical', 'support', 'error', 'bug'],
        },
        {
          id: 'pricing_inquiry',
          name: 'Pricing Inquiry',
          template: `I'd be happy to provide information about our pricing. To give you the most accurate information, could you please specify which service or product you're interested in?`,
          context: ['pricing', 'cost', 'price', 'fee'],
        },
        {
          id: 'emergency',
          name: 'Emergency Response',
          template: `I understand this is an urgent situation. I'll help you as quickly as possible. Please provide the essential details so I can assist you effectively.`,
          context: ['emergency', 'urgent', 'immediate'],
          conditions: {
            requiresApproval: true
          }
        },
        {
          id: 'general',
          name: 'General Response',
          template: `I'm here to help! I'll do my best to assist you with your request. Please let me know if you need any clarification or have additional questions.`,
          context: ['general', 'other'],
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

  async getBusinessInfo(tenantId: string): Promise<BusinessInfo> {
    const config = await this.getConfig(tenantId);
    return config.businessInfo;
  }

  async updateBusinessInfo(tenantId: string, businessInfo: Partial<BusinessInfo>): Promise<BusinessInfo> {
    const config = await this.getConfig(tenantId);
    config.businessInfo = { ...config.businessInfo, ...businessInfo };
    await this.setConfig(config);
    return config.businessInfo;
  }

  async isBusinessOpen(tenantId: string): Promise<boolean> {
    const businessInfo = await this.getBusinessInfo(tenantId);
    const now = new Date();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toLocaleTimeString('en-US', { hour12: false });
    
    const todaySchedule = businessInfo.workingHours[dayOfWeek];
    if (!todaySchedule || !todaySchedule.isOpen) {
      return false;
    }

    return currentTime >= todaySchedule.open && currentTime <= todaySchedule.close;
  }

  private getBusinessSpecificTemplates(businessType: BusinessType): ResponseTemplate[] {
    const commonTemplates = [
      {
        id: 'greeting',
        name: 'Standard Greeting',
        template: `Hello! 👋 I'm your friendly AI assistant from {businessName}. I'm here to help you with any questions or tasks you might have. How can I assist you today?`,
        context: ['initial_contact', 'greeting'],
      },
      {
        id: 'working_hours',
        name: 'Working Hours Inquiry',
        template: `Our business hours are as follows:
Monday to Friday: {weekdayHours}
Saturday: {saturdayHours}
Sunday: {sundayHours}

We are currently {isOpen}.`,
        context: ['hours', 'schedule', 'opening'],
      },
      {
        id: 'location',
        name: 'Location Inquiry',
        template: `We are located at:
{businessName}
{street}
{city}, {state} {postalCode}
{country}

You can find us on Google Maps or contact us at {phone} for directions.`,
        context: ['location', 'address', 'directions'],
      }
    ];

    const businessSpecificTemplates: Record<BusinessType, ResponseTemplate[]> = {
      [BusinessType.HOTEL]: [
        {
          id: 'room_booking',
          name: 'Room Booking',
          template: `I can help you with your room booking at {businessName}. We offer various room types and amenities. Could you please provide:
- Check-in and check-out dates
- Number of guests
- Room preferences (if any)
- Any special requirements`,
          context: ['booking', 'reservation', 'room'],
        },
        {
          id: 'amenities',
          name: 'Amenities Inquiry',
          template: `At {businessName}, we offer the following amenities:
- Free WiFi
- Swimming pool
- Fitness center
- Restaurant
- Room service
- Parking
- And more!

Would you like to know more about any specific amenity?`,
          context: ['amenities', 'facilities', 'services'],
        }
      ],
      [BusinessType.RESTAURANT]: [
        {
          id: 'reservation',
          name: 'Table Reservation',
          template: `I can help you make a reservation at {businessName}. Please provide:
- Date and time
- Number of guests
- Any special requests or dietary requirements`,
          context: ['reservation', 'booking', 'table'],
        },
        {
          id: 'menu',
          name: 'Menu Inquiry',
          template: `Our menu features a variety of dishes, including:
- Appetizers
- Main courses
- Desserts
- Special dietary options

Would you like to see our full menu or have any specific dietary requirements?`,
          context: ['menu', 'food', 'dietary'],
        }
      ],
      [BusinessType.CLINIC]: [
        {
          id: 'appointment',
          name: 'Appointment Booking',
          template: `I can help you schedule an appointment at {businessName}. Please provide:
- Preferred date and time
- Type of consultation needed
- Any specific doctor preference
- Insurance information (if applicable)`,
          context: ['appointment', 'booking', 'consultation'],
        },
        {
          id: 'services',
          name: 'Medical Services',
          template: `We offer various medical services including:
- General consultations
- Specialized treatments
- Emergency care
- Preventive care

What specific service are you interested in?`,
          context: ['services', 'treatments', 'medical'],
        }
      ],
      [BusinessType.RETAIL]: [
        {
          id: 'product_inquiry',
          name: 'Product Inquiry',
          template: `I can help you with information about our products at {businessName}. We offer:
- {productCategories}
- Special promotions
- Gift cards
- Online ordering

What specific product are you looking for?`,
          context: ['products', 'items', 'shopping'],
        },
        {
          id: 'return_policy',
          name: 'Return Policy',
          template: `Our return policy at {businessName} is as follows:
- Items can be returned within 30 days
- Original receipt required
- Items must be in original condition
- Refunds are processed within 5-7 business days

Do you have any specific questions about our return policy?`,
          context: ['returns', 'refunds', 'policy'],
        }
      ],
      [BusinessType.SERVICE]: [
        {
          id: 'service_booking',
          name: 'Service Booking',
          template: `I can help you book our services at {businessName}. We offer:
- {serviceList}
- Flexible scheduling
- Professional staff
- Quality guarantee

What service would you like to book?`,
          context: ['booking', 'service', 'appointment'],
        }
      ],
      [BusinessType.OTHER]: []
    };

    return [...commonTemplates, ...(businessSpecificTemplates[businessType] || [])];
  }

  async initializeTenantConfig(tenantId: string, businessInfo: BusinessInfo) {
    const config: AgentConfig = {
      tenantId,
      businessInfo,
      responseTemplates: this.getBusinessSpecificTemplates(businessInfo.type),
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
        }
      ],
      defaultDecisionLevel: DecisionLevel.CONSULTATION
    };

    await this.setConfig(config);
    return config;
  }
} 