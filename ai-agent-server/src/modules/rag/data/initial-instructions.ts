import { Injectable } from '@nestjs/common';
import { RagService } from '../rag.service';
import { RagInstruction } from '../rag.service';

@Injectable()
export class InitialInstructionsService {
  constructor(private ragService: RagService) {}

  /**
   * Loads initial instructions from the database using RAG service
   * This replaces the hardcoded instructions with dynamic database-driven ones
   */
  async getInitialInstructions(businessType: string = 'general'): Promise<RagInstruction[]> {
    try {
      // Get system instructions from database
      const systemInstructions = await this.ragService.listActiveSystemInstructions(businessType);
      
      // Convert system instructions to RagInstruction format for backward compatibility
      return systemInstructions.map(sys => ({
        instructionId: sys.key,
        businessType: sys.businessType,
        category: sys.category,
        instruction: this.formatInstruction(sys.instructionsJson),
        workflow: this.extractWorkflow(sys.instructionsJson),
        requiredPermissions: this.extractPermissions(sys.instructionsJson),
        apiEndpoints: this.extractEndpoints(sys.instructionsJson),
        successCriteria: this.extractSuccessCriteria(sys.instructionsJson),
        notificationTemplate: this.extractNotificationTemplate(sys.instructionsJson),
        isActive: sys.isActive,
        createdAt: sys.createdAt,
        updatedAt: sys.updatedAt,
        metadata: {
          examples: this.extractExamples(sys.instructionsJson),
          keywords: this.extractKeywords(sys.instructionsJson),
          confidence: 0.9
        }
      }));
    } catch (error) {
      console.warn('Failed to load initial instructions from database:', error);
      // Fallback to minimal instructions
      return this.getFallbackInstructions(businessType);
    }
  }

  /**
   * Fallback instructions when database is not available
   */
  private getFallbackInstructions(businessType: string): RagInstruction[] {
    return [
      {
        instructionId: `${businessType}.fallback.v1`,
        businessType: businessType,
        category: 'fallback',
        instruction: `Instrucțiuni de bază pentru ${businessType}`,
        workflow: [
          {
            step: 1,
            action: 'identify_request',
            description: 'Identifică tipul cererii',
            validation: 'has_request_type'
          },
          {
            step: 2,
            action: 'process_request',
            description: 'Procesează cererea',
            validation: 'request_processed'
          }
        ],
        requiredPermissions: ['basic_access'],
        apiEndpoints: ['/api/basic'],
        successCriteria: ['request_processed'],
        notificationTemplate: 'Cererea a fost procesată',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          examples: ['Cerere de bază'],
          keywords: ['basic', 'fallback'],
          confidence: 0.5
        }
      }
    ];
  }

  private formatInstruction(instructionsJson: any): string {
    if (typeof instructionsJson === 'string') {
      return instructionsJson;
    }
    
    if (instructionsJson.instructions?.primary) {
      return instructionsJson.instructions.primary;
    }
    
    return JSON.stringify(instructionsJson);
  }

  private extractWorkflow(instructionsJson: any): any[] {
    if (instructionsJson.instructions?.actions) {
      return instructionsJson.instructions.actions.map((action: string, index: number) => ({
        step: index + 1,
        action: action.toLowerCase().replace(/\s+/g, '_'),
        description: action,
        validation: 'action_completed'
      }));
    }
    
    return [];
  }

  private extractPermissions(instructionsJson: any): string[] {
    if (instructionsJson.capabilities) {
      const permissions = [];
      if (instructionsJson.capabilities.canAccessAllData) permissions.push('data:read');
      if (instructionsJson.capabilities.canModifyReservations) permissions.push('reservations:write');
      if (instructionsJson.capabilities.canListAllResources) permissions.push('resources:read');
      return permissions;
    }
    
    return ['basic_access'];
  }

  private extractEndpoints(instructionsJson: any): string[] {
    const endpoints = ['/api/basic'];
    
    if (instructionsJson.capabilities?.canAccessAllData) {
      endpoints.push('/api/data', '/api/resources');
    }
    
    if (instructionsJson.capabilities?.canModifyReservations) {
      endpoints.push('/api/reservations');
    }
    
    return endpoints;
  }

  private extractSuccessCriteria(instructionsJson: any): string[] {
    const criteria = ['request_processed'];
    
    if (instructionsJson.capabilities?.canAccessAllData) {
      criteria.push('data_accessed');
    }
    
    if (instructionsJson.capabilities?.canModifyReservations) {
      criteria.push('reservation_handled');
    }
    
    return criteria;
  }

  private extractNotificationTemplate(instructionsJson: any): string {
    if (instructionsJson.role === 'operator') {
      return 'Operator AI: {response}';
    } else if (instructionsJson.role === 'client') {
      return 'Customer AI: {response}';
    }
    
    return 'AI Assistant: {response}';
  }

  private extractExamples(instructionsJson: any): string[] {
    if (instructionsJson.instructions?.actions) {
      return instructionsJson.instructions.actions.slice(0, 3);
    }
    
    return ['Cerere de bază'];
  }

  private extractKeywords(instructionsJson: any): string[] {
    if (instructionsJson.keywords) {
      return instructionsJson.keywords;
    }
    
    return ['basic', 'assistance'];
  }
} 