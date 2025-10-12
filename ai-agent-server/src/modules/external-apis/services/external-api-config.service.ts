import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBClient, tableNames } from '@/config/dynamodb.config';
import { 
  ExternalApiConfig, 
  CreateExternalApiConfigDto, 
  UpdateExternalApiConfigDto,
  SMSConfig,
  EmailConfig,
  RatingConfig,
  SMSTemplate,
  EmailTemplate,
  COMMON_TEMPLATE_VARIABLES
} from '../interfaces/external-api-config.interface';

@Injectable()
export class ExternalApiConfigService {
  private dynamoClient = DynamoDBDocumentClient.from(dynamoDBClient);

  async createConfig(dto: CreateExternalApiConfigDto): Promise<ExternalApiConfig> {
    // Check if config already exists
    const existingConfig = await this.getConfig(dto.businessId, dto.locationId);
    if (existingConfig) {
      throw new ConflictException('Configuration already exists for this business/location');
    }

    const config: ExternalApiConfig = {
      businessId: dto.businessId,
      locationId: dto.locationId,
      sms: this.createDefaultSMSConfig(dto.sms),
      email: this.createDefaultEmailConfig(dto.email),
      rating: this.createDefaultRatingConfig(dto.rating),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    await this.dynamoClient.send(new PutCommand({
      TableName: tableNames.externalApiConfig,
      Item: config
    }));

    return config;
  }

  async getConfig(businessId: string, locationId?: string): Promise<ExternalApiConfig | null> {
    try {
      const result = await this.dynamoClient.send(new GetCommand({
        TableName: tableNames.externalApiConfig,
        Key: {
          businessId,
          locationId: locationId || 'default'
        }
      }));

      return result.Item as ExternalApiConfig || null;
    } catch (error) {
      console.error('Error getting external API config:', error);
      return null;
    }
  }

  async getAllConfigs(): Promise<ExternalApiConfig[]> {
    try {
      const result = await this.dynamoClient.send(new ScanCommand({
        TableName: tableNames.externalApiConfig
      }));

      return (result.Items as ExternalApiConfig[]) || [];
    } catch (error) {
      console.error('Error scanning external API configs:', error);
      return [];
    }
  }

  async getOrCreateConfig(businessId: string, locationId?: string): Promise<ExternalApiConfig> {
    let config = await this.getConfig(businessId, locationId);
    
    if (!config) {
      // Create default configuration if it doesn't exist
      const defaultConfig: ExternalApiConfig = {
        businessId,
        locationId: locationId || 'default',
        sms: this.createDefaultSMSConfig(),
        email: this.createDefaultEmailConfig(),
        rating: this.createDefaultRatingConfig(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      };

      await this.dynamoClient.send(new PutCommand({
        TableName: tableNames.externalApiConfig,
        Item: defaultConfig
      }));

      config = defaultConfig;
    }

    return config;
  }

  async updateConfig(
    businessId: string, 
    dto: UpdateExternalApiConfigDto, 
    locationId?: string
  ): Promise<ExternalApiConfig> {
    const existingConfig = await this.getOrCreateConfig(businessId, locationId);

    const updatedConfig = {
      ...existingConfig,
      sms: dto.sms ? { ...existingConfig.sms, ...dto.sms } : existingConfig.sms,
      email: dto.email ? { ...existingConfig.email, ...dto.email } : existingConfig.email,
      rating: dto.rating ? { ...existingConfig.rating, ...dto.rating } : existingConfig.rating,
      updatedAt: new Date().toISOString(),
      version: existingConfig.version + 1
    };

    await this.dynamoClient.send(new PutCommand({
      TableName: tableNames.externalApiConfig,
      Item: updatedConfig
    }));

    return updatedConfig;
  }

  async deleteConfig(businessId: string, locationId?: string): Promise<void> {
    const existingConfig = await this.getConfig(businessId, locationId);
    if (!existingConfig) {
      throw new NotFoundException('Configuration not found');
    }

    await this.dynamoClient.send(new UpdateCommand({
      TableName: tableNames.externalApiConfig,
      Key: {
        businessId,
        locationId: locationId || 'default'
      },
      UpdateExpression: 'SET #deleted = :deleted, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#deleted': 'deleted'
      },
      ExpressionAttributeValues: {
        ':deleted': true,
        ':updatedAt': new Date().toISOString()
      }
    }));
  }

  async getConfigsByBusiness(businessId: string): Promise<ExternalApiConfig[]> {
    try {
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: tableNames.externalApiConfig,
        KeyConditionExpression: 'businessId = :businessId',
        ExpressionAttributeValues: {
          ':businessId': businessId
        },
        FilterExpression: 'attribute_not_exists(#deleted)',
        ExpressionAttributeNames: {
          '#deleted': 'deleted'
        }
      }));

      return result.Items as ExternalApiConfig[] || [];
    } catch (error) {
      console.error('Error getting configs by business:', error);
      return [];
    }
  }

  // Template management methods
  async addSMSTemplate(
    businessId: string, 
    template: SMSTemplate, 
    locationId?: string
  ): Promise<ExternalApiConfig> {
    const config = await this.getOrCreateConfig(businessId, locationId);

    // Check if template with same ID already exists
    if (config.sms.templates.some(t => t.id === template.id)) {
      throw new ConflictException('Template with this ID already exists');
    }

    const updatedConfig = {
      ...config,
      sms: {
        ...config.sms,
        templates: [...config.sms.templates, template]
      },
      updatedAt: new Date().toISOString(),
      version: config.version + 1
    };

    await this.dynamoClient.send(new PutCommand({
      TableName: tableNames.externalApiConfig,
      Item: updatedConfig
    }));

    return updatedConfig;
  }

  async updateSMSTemplate(
    businessId: string, 
    templateId: string, 
    template: Partial<SMSTemplate>, 
    locationId?: string
  ): Promise<ExternalApiConfig> {
    const config = await this.getOrCreateConfig(businessId, locationId);

    const templateIndex = config.sms.templates.findIndex(t => t.id === templateId);
    if (templateIndex === -1) {
      throw new NotFoundException('SMS template not found');
    }

    const updatedTemplates = [...config.sms.templates];
    updatedTemplates[templateIndex] = { ...updatedTemplates[templateIndex], ...template };

    const updatedConfig = {
      ...config,
      sms: {
        ...config.sms,
        templates: updatedTemplates
      },
      updatedAt: new Date().toISOString(),
      version: config.version + 1
    };

    await this.dynamoClient.send(new PutCommand({
      TableName: tableNames.externalApiConfig,
      Item: updatedConfig
    }));

    return updatedConfig;
  }

  async deleteSMSTemplate(
    businessId: string, 
    templateId: string, 
    locationId?: string
  ): Promise<ExternalApiConfig> {
    const config = await this.getOrCreateConfig(businessId, locationId);

    const updatedTemplates = config.sms.templates.filter(t => t.id !== templateId);
    
    // If we're deleting the default template, reset to first available template
    let defaultTemplate = config.sms.defaultTemplate;
    if (defaultTemplate === templateId && updatedTemplates.length > 0) {
      defaultTemplate = updatedTemplates[0].id;
    }

    const updatedConfig = {
      ...config,
      sms: {
        ...config.sms,
        templates: updatedTemplates,
        defaultTemplate
      },
      updatedAt: new Date().toISOString(),
      version: config.version + 1
    };

    await this.dynamoClient.send(new PutCommand({
      TableName: tableNames.externalApiConfig,
      Item: updatedConfig
    }));

    return updatedConfig;
  }

  async addEmailTemplate(
    businessId: string, 
    template: EmailTemplate, 
    locationId?: string
  ): Promise<ExternalApiConfig> {
    const config = await this.getOrCreateConfig(businessId, locationId);

    // Check if template with same ID already exists
    if (config.email.templates.some(t => t.id === template.id)) {
      throw new ConflictException('Template with this ID already exists');
    }

    const updatedConfig = {
      ...config,
      email: {
        ...config.email,
        templates: [...config.email.templates, template]
      },
      updatedAt: new Date().toISOString(),
      version: config.version + 1
    };

    await this.dynamoClient.send(new PutCommand({
      TableName: tableNames.externalApiConfig,
      Item: updatedConfig
    }));

    return updatedConfig;
  }

  async updateEmailTemplate(
    businessId: string, 
    templateId: string, 
    template: Partial<EmailTemplate>, 
    locationId?: string
  ): Promise<ExternalApiConfig> {
    const config = await this.getOrCreateConfig(businessId, locationId);

    const templateIndex = config.email.templates.findIndex(t => t.id === templateId);
    if (templateIndex === -1) {
      throw new NotFoundException('Email template not found');
    }

    const updatedTemplates = [...config.email.templates];
    updatedTemplates[templateIndex] = { ...updatedTemplates[templateIndex], ...template };

    const updatedConfig = {
      ...config,
      email: {
        ...config.email,
        templates: updatedTemplates
      },
      updatedAt: new Date().toISOString(),
      version: config.version + 1
    };

    await this.dynamoClient.send(new PutCommand({
      TableName: tableNames.externalApiConfig,
      Item: updatedConfig
    }));

    return updatedConfig;
  }

  async deleteEmailTemplate(
    businessId: string, 
    templateId: string, 
    locationId?: string
  ): Promise<ExternalApiConfig> {
    const config = await this.getOrCreateConfig(businessId, locationId);

    const updatedTemplates = config.email.templates.filter(t => t.id !== templateId);
    
    // If we're deleting the default template, reset to first available template
    let defaultTemplate = config.email.defaultTemplate;
    if (defaultTemplate === templateId && updatedTemplates.length > 0) {
      defaultTemplate = updatedTemplates[0].id;
    }

    const updatedConfig = {
      ...config,
      email: {
        ...config.email,
        templates: updatedTemplates,
        defaultTemplate
      },
      updatedAt: new Date().toISOString(),
      version: config.version + 1
    };

    await this.dynamoClient.send(new PutCommand({
      TableName: tableNames.externalApiConfig,
      Item: updatedConfig
    }));

    return updatedConfig;
  }

  // Helper methods for processing templates
  processTemplate(template: string, variables: Record<string, string>): string {
    let processedTemplate = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      processedTemplate = processedTemplate.replace(new RegExp(placeholder, 'g'), value || '');
    });

    return processedTemplate;
  }

  getTemplateVariables(): typeof COMMON_TEMPLATE_VARIABLES {
    return COMMON_TEMPLATE_VARIABLES;
  }

  private createDefaultSMSConfig(overrides?: Partial<SMSConfig>): SMSConfig {
    const defaultTemplate: SMSTemplate = {
      id: 'default',
      name: 'Template Implicit',
      content: `Salut {{patientName}}! Programarea ta la {{locationName}} este confirmată pentru {{appointmentDate}} la ora {{appointmentTime}}.

Codul tău de acces: {{accessCode}}
Link: {{patientUrl}}

Te așteptăm!`,
      variables: ['patientName', 'locationName', 'appointmentDate', 'appointmentTime', 'accessCode', 'patientUrl']
    };

    return {
      enabled: false,
      sendOnBooking: false,
      sendReminder: false,
      reminderTiming: 'day_before',
      defaultTemplate: 'default',
      templates: [defaultTemplate],
      serviceType: 'aws_sns',
      ...overrides
    };
  }

  private createDefaultEmailConfig(overrides?: Partial<EmailConfig>): EmailConfig {
    const defaultTemplate: EmailTemplate = {
      id: 'default',
      name: 'Template Implicit',
      subject: 'Confirmare programare - {{locationName}}',
      content: `Salut {{patientName}},

Programarea ta la {{locationName}} a fost confirmată cu succes!

Detalii programare:
- Data: {{appointmentDate}}
- Ora: {{appointmentTime}}
- Serviciu: {{serviceName}}
- Doctor: {{doctorName}}
- Adresă: {{address}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 CODUL TĂU DE ACCES: {{accessCode}}

Folosește acest cod pentru a accesa pagina ta de pacient unde poți:
• Vedea programările tale
• Anula programări
• Vezi planul de tratament
• Accesa istoric și facturi

🔗 Link rapid: {{patientUrl}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dacă ai întrebări, ne poți contacta la {{phoneNumber}}.

Cu stimă,
Echipa {{locationName}}`,
      variables: ['patientName', 'locationName', 'appointmentDate', 'appointmentTime', 'serviceName', 'doctorName', 'address', 'phoneNumber', 'accessCode', 'patientUrl']
    };

    return {
      enabled: false,
      sendOnBooking: false,
      sendReminder: false,
      reminderTiming: 'day_before',
      defaultTemplate: 'default',
      templates: [defaultTemplate],
      serviceType: 'gmail',
      senderName: '',
      ...overrides
    };
  }

  private createDefaultRatingConfig(overrides?: Partial<RatingConfig>): RatingConfig {
    const defaultTemplate: EmailTemplate = {
      id: 'default',
      name: 'Cerere Rating Implicit',
      subject: 'Cum a fost experiența ta la {{locationName}}?',
      content: `Salut {{patientName}},

Mulțumim că ai ales {{locationName}}!

Programarea ta din data de {{appointmentDate}} la ora {{appointmentTime}} a fost marcată ca finalizată.

Ne-ar ajuta enorm dacă ne-ai putea oferi un scurt feedback despre experiența ta:

🔗 Oferă-ne un rating: {{ratingUrl}}

Link-ul este valabil pentru o singură utilizare și este disponibil timp de 30 de zile.

Feedback-ul tău ne ajută să îmbunătățim constant serviciile noastre.

Cu stimă,
Echipa {{locationName}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dacă ai întrebări, ne poți contacta la {{phoneNumber}}.`,
      variables: ['patientName', 'locationName', 'appointmentDate', 'appointmentTime', 'ratingUrl', 'phoneNumber']
    };

    return {
      enabled: false,
      sendOnCompletion: false,
      defaultTemplate: 'default',
      templates: [defaultTemplate],
      allowAnonymous: true,
      ...overrides
    };
  }
}
