import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { openaiConfig } from '@/config/openai.config';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBClient } from '@/config/dynamodb.config';

export interface RagContext {
  businessType: 'dental' | 'gym' | 'hotel';
  role: 'operator' | 'customer';
  businessId: string;
  locationId: string;
  userId: string;
  message: string;
  sessionId: string;
  source: 'websocket' | 'webhook' | 'cron';
}

export interface RagResult {
  instructions: string[];
  context: any;
  resources: any[];
  response: string;
}

@Injectable()
export class SimplifiedRagService {
  private openaiModel: ChatOpenAI;
  private dynamoClient = DynamoDBDocumentClient.from(dynamoDBClient);

  constructor() {
    this.initializeOpenAI();
  }

  // RAG bazat pe businessType + role
  async getRagForRoleAndBusiness(
    businessType: string, 
    role: string, 
    context: RagContext
  ): Promise<RagResult> {
    const ragKey = `${role}.${businessType}.general`;
    
    // Get instructions for this specific role + businessType combination
    const instructions = await this.getInstructionsForRagKey(ragKey, context);
    
    // Get relevant resources for this businessType
    const resources = await this.getResourcesForBusinessType(businessType, context);
    
    // Generate context-aware response
    const response = await this.generateContextualResponse(ragKey, instructions, resources, context);
    
    return {
      instructions,
      context: this.buildContext(context),
      resources,
      response
    };
  }

  // RAG pentru resurse specifice per businessType
  async getResourceRag(
    businessType: string,
    resourceType: string,
    context: RagContext
  ): Promise<any> {
    const resourceKey = `${businessType}.${resourceType}`;
    
    // Get specific resource instructions
    const resourceInstructions = await this.getResourceInstructions(resourceKey, context);
    
    // Get resource data
    const resourceData = await this.getResourceData(businessType, resourceType, context);
    
    return {
      instructions: resourceInstructions,
      data: resourceData,
      key: resourceKey
    };
  }

  private async getInstructionsForRagKey(ragKey: string, context: RagContext): Promise<string[]> {
    try {
      // Get instructions from DynamoDB
      const command = new GetCommand({
        TableName: 'rag-instructions',
        Key: {
          ragKey: ragKey,
          version: 'v1'
        }
      });

      const result = await this.dynamoClient.send(command);
      
      if (result.Item && result.Item.instructions) {
        return result.Item.instructions;
      }
      
      // Fallback to default instructions if not found in database
      console.warn(`No instructions found for ${ragKey}, using fallback`);
      return [
        'Ești un asistent virtual general',
        'Răspunsurile trebuie să fie utile și profesionale'
      ];
    } catch (error) {
      console.error(`Error fetching instructions for ${ragKey}:`, error);
      return [
        'Ești un asistent virtual general',
        'Răspunsurile trebuie să fie utile și profesionale'
      ];
    }
  }

  private async getResourceInstructions(resourceKey: string, context: RagContext): Promise<string[]> {
    const resourceInstructionMap: Record<string, string[]> = {
      'dental.listResources': [
        'Listează toate resursele disponibile pentru clinica dentală',
        'Include servicii, doctori, echipamente și programări',
        'Filtrează după disponibilitate și specializare'
      ],
      'dental.appointment': [
        'Gestionează programările pentru clinica dentală',
        'Verifică disponibilitatea doctorilor',
        'Creează programări noi sau modifică existente',
        'Trimite confirmări și reamintiri'
      ],
      'dental.patient': [
        'Gestionează datele pacienților',
        'Accesează istoricul medical',
        'Actualizează informațiile de contact',
        'Respectă confidențialitatea medicală'
      ],
      'dental.treatments': [
        'Gestionează tratamentele disponibile',
        'Listează prețurile și durata tratamentelor',
        'Asociază tratamente cu doctori specializați',
        'Actualizează informațiile despre tratamente'
      ],
      'gym.listResources': [
        'Listează echipamentele și clasele disponibile',
        'Include programul sălii și antrenorii',
        'Filtrează după tipul de activitate'
      ],
      'gym.membership': [
        'Gestionează abonamentele membrilor',
        'Verifică statusul abonamentului',
        'Procesează plățile și reînnoirile'
      ],
      'hotel.listResources': [
        'Listează camerele și serviciile disponibile',
        'Include facilități și prețuri',
        'Filtrează după tipul de cameră'
      ],
      'hotel.booking': [
        'Gestionează rezervările hotelului',
        'Verifică disponibilitatea camerelor',
        'Procesează check-in/check-out'
      ]
    };

    return resourceInstructionMap[resourceKey] || [
      'Gestionează resursele pentru business-ul specificat',
      'Furnizează informații relevante și actualizate'
    ];
  }

  private async getResourcesForBusinessType(businessType: string, context: RagContext): Promise<any[]> {
    try {
      // Get resource data from DynamoDB
      const command = new QueryCommand({
        TableName: 'rag-resource-data',
        IndexName: 'businessType-index',
        KeyConditionExpression: 'businessType = :businessType',
        ExpressionAttributeValues: {
          ':businessType': businessType
        }
      });

      const result = await this.dynamoClient.send(command);
      
      if (result.Items && result.Items.length > 0) {
        // Return the first item's data (assuming one data entry per business type)
        return result.Items[0].data || [];
      }
      
      // Fallback to empty array if no data found
      console.warn(`No resource data found for ${businessType}`);
      return [];
    } catch (error) {
      console.error(`Error fetching resources for ${businessType}:`, error);
      return [];
    }
  }

  private async getResourceData(businessType: string, resourceType: string, context: RagContext): Promise<any> {
    // This would typically fetch from database or external APIs
    // For now, return mock data based on the resource type
    const resourceDataMap: Record<string, any> = {
      'dental.listResources': {
        services: ['Consultatie', 'Tratament endodontic', 'Implant'],
        doctors: ['Dr. Popescu', 'Dr. Ionescu'],
        equipment: ['Radiograf digital', 'Fotoliu dental']
      },
      'dental.appointment': {
        availableSlots: ['09:00', '10:30', '14:00', '15:30'],
        doctors: ['Dr. Popescu', 'Dr. Ionescu'],
        services: ['Consultatie', 'Tratament']
      },
      'dental.patient': {
        patientInfo: { name: 'Pacient', phone: '0712345678' },
        history: ['Ultima vizita: 2024-01-15'],
        treatments: ['Tratament endodontic completat']
      },
      'dental.treatments': {
        treatments: [
          { name: 'Consultatie', price: 150, duration: 30 },
          { name: 'Tratament endodontic', price: 300, duration: 60 }
        ]
      }
    };

    const key = `${businessType}.${resourceType}`;
    return resourceDataMap[key] || { message: 'Resursa nu a fost găsită' };
  }

  private buildContext(context: RagContext): any {
    return {
      businessType: context.businessType,
      role: context.role,
      businessId: context.businessId,
      locationId: context.locationId,
      userId: context.userId,
      sessionId: context.sessionId,
      source: context.source,
      timestamp: new Date().toISOString()
    };
  }

  private async generateContextualResponse(
    ragKey: string, 
    instructions: string[], 
    resources: any[], 
    context: RagContext
  ): Promise<string> {
    const prompt = `
    Generează un răspuns contextual bazat pe:
    
    RAG Key: ${ragKey}
    Instrucțiuni: ${instructions.join(', ')}
    Resurse disponibile: ${JSON.stringify(resources)}
    Context: ${JSON.stringify(context)}
    
    Răspunsul trebuie să fie:
    - Specific pentru rolul și tipul de business
    - Util și acționabil
    - În limba română
    - Să nu depășească 150 de cuvinte
    `;

    try {
      const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
      return response.content as string;
    } catch (error) {
      console.error('Error generating contextual response:', error);
      return 'Îmi pare rău, dar am întâmpinat o problemă la generarea răspunsului.';
    }
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
      console.log('Simplified RAG Service: OpenAI model initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize OpenAI model for Simplified RAG:', error.message);
      // Fallback mock model
      this.openaiModel = {
        invoke: async (messages: any[]) => {
          console.warn('Using fallback OpenAI model for Simplified RAG');
          return { content: 'Răspuns generat de sistemul RAG simplificat.' };
        }
      } as any;
    }
  }
}
