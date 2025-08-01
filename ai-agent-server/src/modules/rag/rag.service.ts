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
        // Verificare cuvinte cheie
        const keywordMatch = instruction.metadata.keywords.some(keyword =>
          queryLower.includes(keyword.toLowerCase())
        );

        // Verificare exemple
        const exampleMatch = instruction.metadata.examples.some(example =>
          queryLower.includes(example.toLowerCase())
        );

        // Verificare categorie
        const categoryMatch = queryLower.includes(instruction.category.toLowerCase());

        return keywordMatch || exampleMatch || categoryMatch;
      })
      .sort((a, b) => b.metadata.confidence - a.metadata.confidence);
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
        if (b.metadata.confidence !== a.metadata.confidence) {
          return b.metadata.confidence - a.metadata.confidence;
        }
        
        // Sortare secundară după data creării (cele mai noi primele)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }
} 