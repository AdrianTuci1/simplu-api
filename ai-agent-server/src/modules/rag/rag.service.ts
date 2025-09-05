import { Injectable } from '@nestjs/common';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBClient, tableNames } from '@/config/dynamodb.config';

export interface RagInstruction {
  instructionId: string;       // Partition Key
  businessType: string;        // Sort Key ('dental', 'gym', 'hotel')
  category: string;            // 'rezervare', 'servicii', 'clienti', etc.
  instruction: string;         // Instrucțiunea principală
  workflow: WorkflowStep[];    // Pașii workflow-ului
  requiredPermissions: string[]; // Permisiuni necesare
  apiEndpoints: string[];      // Endpoint-uri API necesare
  successCriteria: string[];   // Criterii de succes
  notificationTemplate: string; // Template pentru notificare coordonator
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metadata: {
    examples: string[];        // Exemple de utilizare
    keywords: string[];        // Cuvinte cheie pentru căutare
    confidence: number;        // Nivel de încredere pentru acțiunea autonomă
  };
}

export interface RagSystemInstruction {
  key: string;               // e.g., "dental.operator.request_handling.v1"
  businessType: string;      // 'dental' | 'gym' | 'hotel' | 'general'
  category: string;          // high-level category
  instructionsJson: any;     // arbitrary JSON with rules/playbooks
  version?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStep {
  step: number;
  action: string;
  description: string;
  apiCall?: {
    method: string;
    endpoint: string;
    dataTemplate: string;
  };
  validation?: string;
  errorHandling?: string;
}

@Injectable()
export class RagService {
  private dynamoClient = DynamoDBDocumentClient.from(dynamoDBClient, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });

  async getInstructionsForRequest(
    request: string,
    businessType: string,
    context: any
  ): Promise<RagInstruction[]> {
    // Use system instructions instead of specific workflow instructions
    const systemInstructions = await this.listActiveSystemInstructions(businessType);
    
    // Convert system instructions to RagInstruction format for compatibility
    return systemInstructions.map(sys => ({
      instructionId: sys.key,
      businessType: sys.businessType,
      category: sys.category,
      instruction: JSON.stringify(sys.instructionsJson),
      workflow: [],
      requiredPermissions: [],
      apiEndpoints: [],
      successCriteria: [],
      notificationTemplate: '',
      isActive: sys.isActive,
      createdAt: sys.createdAt,
      updatedAt: sys.updatedAt,
      metadata: {
        examples: [],
        keywords: [],
        confidence: 0.8
      }
    }));
  }



  // System RAG (read-only)
  async getSystemInstructionByKey(key: string): Promise<RagSystemInstruction | null> {
    try {
      const result = await this.dynamoClient.send(new GetCommand({
        TableName: tableNames.ragSystemInstructions,
        Key: { key },
      }));
      return (result as any).Item || null;
    } catch (error) {
      if ((error as any)?.name === 'ResourceNotFoundException') {
        console.info('RAG: system instruction not found by key (initial empty state)');
      } else {
        console.warn('RAG: issue getting system instruction by key:', error);
      }
      return null;
    }
  }

  async listSystemInstructionsByBusinessType(businessType: string): Promise<RagSystemInstruction[]> {
    try {
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: tableNames.ragSystemInstructions,
        KeyConditionExpression: 'businessType = :businessType',
        ExpressionAttributeValues: {
          ':businessType': businessType,
        },
      }));
      return (result.Items || []) as RagSystemInstruction[];
    } catch (error) {
      if ((error as any)?.name === 'ResourceNotFoundException') {
        console.info('RAG: system instructions table not found (initial empty state)');
      } else {
        console.warn('RAG: issue listing system instructions by business type:', error);
      }
      return [];
    }
  }

  async listActiveSystemInstructions(businessType: string): Promise<RagSystemInstruction[]> {
    const all = await this.listSystemInstructionsByBusinessType(businessType);
    return all.filter((i) => i.isActive);
  }

  // Dynamic memory: business-level
  // Key structure: businessId#businessType#action (e.g., "biz123#dental#appointment_booking")
  async getDynamicBusinessMemory(businessId: string, businessType: string, action: string = 'general'): Promise<Record<string, any> | null> {
    try {
      const memoryKey = `${businessId}#${businessType}#${action}`;
      const result = await this.dynamoClient.send(new GetCommand({
        TableName: tableNames.ragDynamicBusiness,
        Key: { memoryKey }
      }));
      return (result as any).Item || null;
    } catch (error) {
      if ((error as any)?.name === 'ResourceNotFoundException') {
        console.info('RAG: dynamic business memory not found (initial empty state)');
      } else {
        console.warn('RAG: issue getting dynamic business memory:', error);
      }
      return null;
    }
  }

  async putDynamicBusinessMemory(businessId: string, businessType: string, action: string, memory: Record<string, any>): Promise<void> {
    try {
      const memoryKey = `${businessId}#${businessType}#${action}`;
      await this.dynamoClient.send(new PutCommand({
        TableName: tableNames.ragDynamicBusiness,
        Item: { 
          memoryKey,
          businessId,
          businessType,
          action,
          ...memory, 
          updatedAt: new Date().toISOString() 
        }
      }));
    } catch (error) {
      console.error('Error putting dynamic business memory:', error);
    }
  }

  // Legacy method for backward compatibility
  async getDynamicBusinessMemoryLegacy(businessIdOrType: string): Promise<Record<string, any> | null> {
    try {
      const result = await this.dynamoClient.send(new GetCommand({
        TableName: tableNames.ragDynamicBusiness,
        Key: { businessId: businessIdOrType }
      }));
      return (result as any).Item || null;
    } catch (error) {
      if ((error as any)?.name === 'ResourceNotFoundException') {
        console.info('RAG: dynamic business memory not found (initial empty state)');
      } else {
        console.warn('RAG: issue getting dynamic business memory:', error);
      }
      return null;
    }
  }

  // Dynamic memory: user-level
  // Key structure: businessId#userId#platform (e.g., "biz123#user456#meta" or "biz123#user456#whatsapp")
  // This allows tracking the same user across multiple platforms (Facebook, WhatsApp, ElevenLabs, etc.)
  async getDynamicUserMemory(businessId: string, userId: string, platform: string = 'unknown'): Promise<Record<string, any> | null> {
    try {
      const memoryKey = `${businessId}#${userId}#${platform}`;
      const result = await this.dynamoClient.send(new GetCommand({
        TableName: tableNames.ragDynamicUser,
        Key: { memoryKey }
      }));
      return (result as any).Item || null;
    } catch (error) {
      if ((error as any)?.name === 'ResourceNotFoundException') {
        console.info('RAG: dynamic user memory not found (initial empty state)');
      } else {
        console.warn('RAG: issue getting dynamic user memory:', error);
      }
      return null;
    }
  }

  async putDynamicUserMemory(businessId: string, userId: string, platform: string, memory: Record<string, any>): Promise<void> {
    try {
      const memoryKey = `${businessId}#${userId}#${platform}`;
      await this.dynamoClient.send(new PutCommand({
        TableName: tableNames.ragDynamicUser,
        Item: { 
          memoryKey,
          businessId,
          userId,
          platform,
          ...memory, 
          updatedAt: new Date().toISOString() 
        }
      }));
    } catch (error) {
      console.error('Error putting dynamic user memory:', error);
    }
  }

  // Get user memory across all platforms for a business
  async getDynamicUserMemoryAllPlatforms(businessId: string, userId: string): Promise<Record<string, any>[]> {
    try {
      const result = await this.dynamoClient.send(new ScanCommand({
        TableName: tableNames.ragDynamicUser,
        FilterExpression: 'businessId = :businessId AND userId = :userId',
        ExpressionAttributeValues: {
          ':businessId': businessId,
          ':userId': userId
        }
      }));
      return (result.Items || []) as Record<string, any>[];
    } catch (error) {
      console.warn('RAG: issue getting user memory across platforms:', error);
      return [];
    }
  }

  // Legacy method for backward compatibility
  async getDynamicUserMemoryLegacy(businessIdOrType: string, userId: string): Promise<Record<string, any> | null> {
    try {
      const result = await this.dynamoClient.send(new GetCommand({
        TableName: tableNames.ragDynamicUser,
        Key: { businessId: businessIdOrType, userId }
      }));
      return (result as any).Item || null;
    } catch (error) {
      if ((error as any)?.name === 'ResourceNotFoundException') {
        console.info('RAG: dynamic user memory not found (initial empty state)');
      } else {
        console.warn('RAG: issue getting dynamic user memory:', error);
      }
      return null;
    }
  }
} 