import { Injectable } from '@nestjs/common';
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
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
  private dynamoClient = DynamoDBDocumentClient.from(dynamoDBClient);

  async getInstructionsForRequest(
    request: string,
    businessType: string,
    context: any
  ): Promise<RagInstruction[]> {
    // Căutare instrucțiuni relevante în RAG
    const query = `Instrucțiuni pentru: ${request} în contextul unui business de tip ${businessType}`;
    
    const results = await this.searchRelevantContent(query, businessType, context);
    
    // Filtrare și ranking instrucțiuni
    return this.filterAndRankInstructions(results, request, businessType);
  }

  async getWorkflowForCategory(
    category: string,
    businessType: string
  ): Promise<WorkflowStep[]> {
    const instruction = await this.getInstructionByCategory(category, businessType);
    return instruction?.workflow || [];
  }

  async getNotificationTemplate(
    category: string,
    businessType: string,
    action: string
  ): Promise<string> {
    const instruction = await this.getInstructionByCategory(category, businessType);
    return instruction?.notificationTemplate || '';
  }

  async getInstructionByCategory(
    category: string,
    businessType: string
  ): Promise<RagInstruction | null> {
    try {
      const result = await this.dynamoClient.send(new GetCommand({
        TableName: tableNames.ragInstructions,
        Key: {
          instructionId: `${businessType}-${category}`,
          businessType
        }
      }));

      return result.Item ? result.Item as RagInstruction : null;
    } catch (error) {
      console.error('Error getting instruction by category:', error);
      return null;
    }
  }

  private async searchRelevantContent(
    query: string,
    businessType: string,
    context: any
  ): Promise<RagInstruction[]> {
    try {
      // Căutare în DynamoDB cu filtrare pe business type
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: tableNames.ragInstructions,
        KeyConditionExpression: 'businessType = :businessType',
        FilterExpression: 'isActive = :isActive',
        ExpressionAttributeValues: {
          ':businessType': businessType,
          ':isActive': true
        }
      }));

      const instructions = result.Items ? 
        result.Items.map(item => item as RagInstruction) : [];

      // Filtrare pe categorii relevante
      return this.filterByRelevance(instructions, query, context);
    } catch (error) {
      console.error('Error searching RAG content:', error);
      return [];
    }
  }

  private filterByRelevance(
    instructions: RagInstruction[],
    query: string,
    context: any
  ): RagInstruction[] {
    const queryLower = query.toLowerCase();
    
    return instructions
      .filter(instruction => {
        // Verificare dacă metadata există
        if (!instruction.metadata) {
          return false;
        }

        // Verificare cuvinte cheie
        const keywordMatch = instruction.metadata.keywords?.some(keyword =>
          queryLower.includes(keyword.toLowerCase())
        ) || false;

        // Verificare exemple
        const exampleMatch = instruction.metadata.examples?.some(example =>
          queryLower.includes(example.toLowerCase())
        ) || false;

        // Verificare categorie
        const categoryMatch = queryLower.includes(instruction.category.toLowerCase());

        return keywordMatch || exampleMatch || categoryMatch;
      })
      .sort((a, b) => {
        // Verificare dacă metadata există pentru sortare
        const confidenceA = a.metadata?.confidence || 0;
        const confidenceB = b.metadata?.confidence || 0;
        return confidenceB - confidenceA;
      });
  }

  private filterAndRankInstructions(
    results: RagInstruction[],
    request: string,
    businessType: string
  ): RagInstruction[] {
    // Implementare ranking bazat pe relevanță și încredere
    return results
      .filter(instruction => instruction.isActive)
      .sort((a, b) => {
        // Sortare primară după încredere
        const confidenceA = a.metadata?.confidence || 0;
        const confidenceB = b.metadata?.confidence || 0;
        
        if (confidenceB !== confidenceA) {
          return confidenceB - confidenceA;
        }
        
        // Sortare secundară după data creării (cele mai noi primele)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }

  // Dynamic memory: business-level
  async getDynamicBusinessMemory(businessId: string): Promise<Record<string, any> | null> {
    try {
      const result = await this.dynamoClient.send(new GetCommand({
        TableName: tableNames.ragDynamicBusiness,
        Key: { businessId }
      }));
      return (result as any).Item || null;
    } catch (error) {
      console.error('Error getting dynamic business memory:', error);
      return null;
    }
  }

  async putDynamicBusinessMemory(businessId: string, memory: Record<string, any>): Promise<void> {
    try {
      await this.dynamoClient.send(new (require('@aws-sdk/lib-dynamodb').PutCommand)({
        TableName: tableNames.ragDynamicBusiness,
        Item: { businessId, ...memory, updatedAt: new Date().toISOString() }
      }));
    } catch (error) {
      console.error('Error putting dynamic business memory:', error);
    }
  }

  // Dynamic memory: user-level
  async getDynamicUserMemory(businessId: string, userId: string): Promise<Record<string, any> | null> {
    try {
      const result = await this.dynamoClient.send(new GetCommand({
        TableName: tableNames.ragDynamicUser,
        Key: { businessId, userId }
      }));
      return (result as any).Item || null;
    } catch (error) {
      console.error('Error getting dynamic user memory:', error);
      return null;
    }
  }

  async putDynamicUserMemory(businessId: string, userId: string, memory: Record<string, any>): Promise<void> {
    try {
      await this.dynamoClient.send(new (require('@aws-sdk/lib-dynamodb').PutCommand)({
        TableName: tableNames.ragDynamicUser,
        Item: { businessId, userId, ...memory, updatedAt: new Date().toISOString() }
      }));
    } catch (error) {
      console.error('Error putting dynamic user memory:', error);
    }
  }
} 