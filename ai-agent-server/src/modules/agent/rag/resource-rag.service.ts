import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { openaiConfig } from '@/config/openai.config';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBClient } from '@/config/dynamodb.config';

export interface ResourceRagContext {
  businessType: 'dental' | 'gym' | 'hotel';
  resourceType: string;
  businessId: string;
  locationId: string;
  userId: string;
  message: string;
  sessionId: string;
}

export interface ResourceRagResult {
  resourceKey: string;
  instructions: string[];
  data: any;
  actions: any[];
  response: string;
}

@Injectable()
export class ResourceRagService {
  private openaiModel: ChatOpenAI;
  private dynamoClient = DynamoDBDocumentClient.from(dynamoDBClient);

  constructor() {
    this.initializeOpenAI();
  }

  // RAG pentru resurse specifice per businessType
  async getResourceRag(
    businessType: string,
    resourceType: string,
    context: ResourceRagContext
  ): Promise<ResourceRagResult> {
    const resourceKey = `${businessType}.${resourceType}`;
    
    // Get specific resource instructions
    const instructions = await this.getResourceInstructions(resourceKey, context);
    
    // Get resource data
    const data = await this.getResourceData(businessType, resourceType, context);
    
    // Generate actions based on resource type
    const actions = await this.generateResourceActions(resourceKey, data, context);
    
    // Generate response
    const response = await this.generateResourceResponse(resourceKey, instructions, data, context);
    
    return {
      resourceKey,
      instructions,
      data,
      actions,
      response
    };
  }

  // Lista tuturor resurselor disponibile pentru un businessType
  async listAvailableResources(businessType: string, context: ResourceRagContext): Promise<any[]> {
    const resourceMap: Record<string, string[]> = {
      'dental': ['listResources', 'appointment', 'patient', 'treatments'],
      'gym': ['listResources', 'membership', 'classes', 'equipment'],
      'hotel': ['listResources', 'booking', 'rooms', 'services']
    };

    const availableResources = resourceMap[businessType] || [];
    
    return availableResources.map(resourceType => ({
      type: resourceType,
      key: `${businessType}.${resourceType}`,
      name: this.getResourceDisplayName(businessType, resourceType),
      description: this.getResourceDescription(businessType, resourceType)
    }));
  }

  private async getResourceInstructions(resourceKey: string, context: ResourceRagContext): Promise<string[]> {
    try {
      // Get resource instructions from DynamoDB
      const command = new GetCommand({
        TableName: 'rag-resources',
        Key: {
          resourceKey: resourceKey,
          version: 'v1'
        }
      });

      const result = await this.dynamoClient.send(command);
      
      if (result.Item && result.Item.instructions) {
        return result.Item.instructions;
      }
      
      // Fallback to default instructions if not found in database
      console.warn(`No resource instructions found for ${resourceKey}, using fallback`);
      return [
        'Gestionează resursele pentru business-ul specificat',
        'Furnizează informații relevante și actualizate'
      ];
    } catch (error) {
      console.error(`Error fetching resource instructions for ${resourceKey}:`, error);
      return [
        'Gestionează resursele pentru business-ul specificat',
        'Furnizează informații relevante și actualizate'
      ];
    }
  }

  private async getResourceData(businessType: string, resourceType: string, context: ResourceRagContext): Promise<any> {
    try {
      // Get resource data from DynamoDB
      const resourceKey = `${businessType}.${resourceType}`;
      const command = new GetCommand({
        TableName: 'rag-resource-data',
        Key: {
          resourceKey: resourceKey,
          dataType: 'mock'
        }
      });

      const result = await this.dynamoClient.send(command);
      
      if (result.Item && result.Item.data) {
        return result.Item.data;
      }
      
      // Fallback to empty data if not found in database
      console.warn(`No resource data found for ${resourceKey}`);
      return { message: 'Resursa nu a fost găsită' };
    } catch (error) {
      console.error(`Error fetching resource data for ${businessType}.${resourceType}:`, error);
      return { message: 'Resursa nu a fost găsită' };
    }
  }

  private async generateResourceActions(resourceKey: string, data: any, context: ResourceRagContext): Promise<any[]> {
    const actionMap: Record<string, any[]> = {
      'dental.appointment': [
        { type: 'create_appointment', title: 'Creează programare nouă', data: data.availableSlots },
        { type: 'view_schedule', title: 'Vezi programul', data: data.availableSlots },
        { type: 'modify_appointment', title: 'Modifică programare', data: {} }
      ],
      'dental.patient': [
        { type: 'view_patient_info', title: 'Vezi informații pacient', data: data.patientInfo },
        { type: 'view_history', title: 'Vezi istoric medical', data: data.history },
        { type: 'update_patient', title: 'Actualizează date pacient', data: {} }
      ],
      'gym.membership': [
        { type: 'view_membership', title: 'Vezi abonament', data: data.memberInfo },
        { type: 'renew_membership', title: 'Reînnoiește abonament', data: data.memberships },
        { type: 'upgrade_membership', title: 'Upgrade abonament', data: data.memberships }
      ],
      'hotel.booking': [
        { type: 'create_booking', title: 'Creează rezervare', data: data.availableRooms },
        { type: 'view_availability', title: 'Vezi disponibilitate', data: data.availableRooms },
        { type: 'modify_booking', title: 'Modifică rezervare', data: data.bookingInfo }
      ]
    };

    return actionMap[resourceKey] || [
      { type: 'view_resource', title: 'Vezi resursa', data: data }
    ];
  }

  private async generateResourceResponse(
    resourceKey: string, 
    instructions: string[], 
    data: any, 
    context: ResourceRagContext
  ): Promise<string> {
    const prompt = `
    Generează un răspuns pentru resursa ${resourceKey}:
    
    Instrucțiuni: ${instructions.join(', ')}
    Date disponibile: ${JSON.stringify(data)}
    Context: ${JSON.stringify(context)}
    
    Răspunsul trebuie să fie:
    - Specific pentru tipul de resursă
    - Util și acționabil
    - În limba română
    - Să nu depășească 200 de cuvinte
    `;

    try {
      const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
      return response.content as string;
    } catch (error) {
      console.error('Error generating resource response:', error);
      return 'Îmi pare rău, dar am întâmpinat o problemă la generarea răspunsului pentru resursă.';
    }
  }

  private getResourceDisplayName(businessType: string, resourceType: string): string {
    const displayNames: Record<string, Record<string, string>> = {
      'dental': {
        'listResources': 'Lista Resurse',
        'appointment': 'Programări',
        'patient': 'Pacienți',
        'treatments': 'Tratamente'
      },
      'gym': {
        'listResources': 'Lista Resurse',
        'membership': 'Abonamente',
        'classes': 'Clase',
        'equipment': 'Echipamente'
      },
      'hotel': {
        'listResources': 'Lista Resurse',
        'booking': 'Rezervări',
        'rooms': 'Camere',
        'services': 'Servicii'
      }
    };

    return displayNames[businessType]?.[resourceType] || resourceType;
  }

  private getResourceDescription(businessType: string, resourceType: string): string {
    const descriptions: Record<string, Record<string, string>> = {
      'dental': {
        'listResources': 'Listează toate resursele clinicei dentale',
        'appointment': 'Gestionează programările pacienților',
        'patient': 'Gestionează datele pacienților',
        'treatments': 'Gestionează tratamentele disponibile'
      },
      'gym': {
        'listResources': 'Listează toate resursele sălii de sport',
        'membership': 'Gestionează abonamentele membrilor',
        'classes': 'Gestionează clasele de fitness',
        'equipment': 'Gestionează echipamentele sălii'
      },
      'hotel': {
        'listResources': 'Listează toate resursele hotelului',
        'booking': 'Gestionează rezervările oaspeților',
        'rooms': 'Gestionează camerele hotelului',
        'services': 'Gestionează serviciile hotelului'
      }
    };

    return descriptions[businessType]?.[resourceType] || 'Gestionează resursele pentru business-ul specificat';
  }

  private initializeOpenAI(): void {
    try {
      this.openaiModel = new ChatOpenAI({
        modelName: openaiConfig.modelName,
        maxTokens: openaiConfig.maxTokens,
        temperature: openaiConfig.temperature,
        topP: openaiConfig.topP,
        openAIApiKey: process.env.OPENAI_API_KEY,
      });
      console.log('Resource RAG Service: OpenAI model initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize OpenAI model for Resource RAG:', error.message);
      // Fallback mock model
      this.openaiModel = {
        invoke: async (messages: any[]) => {
          console.warn('Using fallback OpenAI model for Resource RAG');
          return { content: 'Răspuns generat de sistemul Resource RAG.' };
        }
      } as any;
    }
  }
}
