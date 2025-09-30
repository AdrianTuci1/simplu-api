import { Injectable } from '@nestjs/common';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBClient, tableNames } from '@/config/dynamodb.config';
import * as fs from 'fs';
import * as path from 'path';

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
  role: 'operator' | 'customer' | 'general'; // Agent role
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

  // Get instructions for operator agent - from database
  async getOperatorInstructions(
    businessType: string,
    context: any
  ): Promise<RagInstruction[]> {
    try {
      // Get system instructions from database
      const systemInstructions = await this.listActiveSystemInstructions(businessType);
      
      // Filter for operator-specific instructions
      const operatorInstructions = systemInstructions.filter(instruction => {
        const instructionsJson = instruction.instructionsJson;
        return instructionsJson?.role === 'operator';
      });
      
      return operatorInstructions.map(instruction => ({
        instructionId: instruction.key,
        businessType: instruction.businessType,
        category: instruction.category,
        instruction: this.formatOperatorInstruction(instruction.instructionsJson),
        workflow: this.extractOperatorWorkflow(instruction.instructionsJson),
        requiredPermissions: this.extractOperatorPermissions(instruction.instructionsJson),
        apiEndpoints: this.extractOperatorEndpoints(instruction.instructionsJson),
        successCriteria: this.extractOperatorSuccessCriteria(instruction.instructionsJson),
        notificationTemplate: this.extractOperatorNotificationTemplate(instruction.instructionsJson),
        isActive: instruction.isActive,
        createdAt: instruction.createdAt,
        updatedAt: instruction.updatedAt,
        metadata: {
          examples: this.extractOperatorExamples(instruction.instructionsJson),
          keywords: this.extractOperatorKeywords(instruction.instructionsJson),
          confidence: 0.9
        }
      }));
    } catch (error) {
      console.warn('Failed to load operator instructions from database, using fallback:', error);
      // Fallback to simplified instructions
      return this.getFallbackOperatorInstructions(businessType);
    }
  }


  // Fallback operator instructions when database is not available
  private getFallbackOperatorInstructions(businessType: string): RagInstruction[] {
    return [
      {
        instructionId: `${businessType}.operator.fallback.v1`,
        businessType: businessType,
        category: 'operator_guidelines',
        instruction: `Ești un operator AI pentru business ${businessType}. Ai acces complet la toate datele și resursele.`,
        workflow: [
          {
            step: 1,
            action: 'identify_request',
            description: 'Identifică tipul cererii',
            validation: 'has_request_type'
          },
          {
            step: 2,
            action: 'query_frontend',
            description: 'Interoghează frontend-ul pentru date',
            validation: 'data_retrieved'
          },
          {
            step: 3,
            action: 'create_draft',
            description: 'Creează draft pentru răspuns',
            validation: 'draft_created'
          },
          {
            step: 4,
            action: 'respond',
            description: 'Generează răspunsul final',
            validation: 'response_generated'
          }
        ],
        requiredPermissions: ['frontend_query', 'draft_creation'],
        apiEndpoints: ['/api/frontend/query', '/api/draft/create'],
        successCriteria: ['data_retrieved', 'draft_created', 'response_generated'],
        notificationTemplate: 'Operator AI: {response}',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          examples: ['Caută pacienți', 'Listează rezervări', 'Verifică disponibilitatea'],
          keywords: ['operator', businessType, 'complete_access'],
          confidence: 0.7
        }
      }
    ];
  }

  // Get instructions for customer agent - from database
  async getCustomerInstructions(
    businessType: string,
    context: any
  ): Promise<RagInstruction[]> {
    try {
      // Get system instructions from database
      const systemInstructions = await this.listActiveSystemInstructions(businessType);
      
      // Filter for customer-specific instructions
      const customerInstructions = systemInstructions.filter(instruction => {
        const instructionsJson = instruction.instructionsJson;
        return instructionsJson?.role === 'client' || instructionsJson?.role === 'customer';
      });
      
      return customerInstructions.map(instruction => ({
        instructionId: instruction.key,
        businessType: instruction.businessType,
        category: instruction.category,
        instruction: this.formatCustomerInstruction(instruction.instructionsJson),
        workflow: this.extractCustomerWorkflow(instruction.instructionsJson),
        requiredPermissions: this.extractCustomerPermissions(instruction.instructionsJson),
        apiEndpoints: this.extractCustomerEndpoints(instruction.instructionsJson),
        successCriteria: this.extractCustomerSuccessCriteria(instruction.instructionsJson),
        notificationTemplate: this.extractCustomerNotificationTemplate(instruction.instructionsJson),
        isActive: instruction.isActive,
        createdAt: instruction.createdAt,
        updatedAt: instruction.updatedAt,
        metadata: {
          examples: this.extractCustomerExamples(instruction.instructionsJson),
          keywords: this.extractCustomerKeywords(instruction.instructionsJson),
          confidence: 0.8
        }
      }));
    } catch (error) {
      console.warn('Failed to load customer instructions from database, using fallback:', error);
      // Fallback to simplified instructions
      return this.getFallbackCustomerInstructions(businessType);
    }
  }

  // Fallback customer instructions when database is not available
  private getFallbackCustomerInstructions(businessType: string): RagInstruction[] {
    return [
      {
        instructionId: `${businessType}.customer.fallback.v1`,
        businessType: businessType,
        category: 'customer_guidelines',
        instruction: `Ești un asistent AI pentru clienții unui business ${businessType}. Poți lista serviciile disponibile și ghida clienții.`,
        workflow: [
          {
            step: 1,
            action: 'recognize_customer',
            description: 'Identifică tipul de client',
            validation: 'customer_identified'
          },
          {
            step: 2,
            action: 'get_services',
            description: 'Listează serviciile disponibile',
            validation: 'services_found'
          },
          {
            step: 3,
            action: 'guide_booking',
            description: 'Ghidează clientul către programare',
            validation: 'booking_guided'
          },
          {
            step: 4,
            action: 'respond',
            description: 'Generează răspunsul final',
            validation: 'response_generated'
          }
        ],
        requiredPermissions: ['service_discovery', 'booking_guidance'],
        apiEndpoints: ['/api/services', '/api/booking'],
        successCriteria: ['customer_recognized', 'services_found', 'booking_guided'],
        notificationTemplate: 'Customer AI: {response}',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          examples: ['Listează servicii', 'Verifică disponibilitatea', 'Ghidează programarea'],
          keywords: ['customer', businessType, 'friendly_guidance'],
          confidence: 0.7
        }
      }
    ];
  }

  // System RAG (read-only)
  async getSystemInstructionByKey(key: string): Promise<RagSystemInstruction | null> {
    try {
      console.log(`RAG: Attempting to get system instruction with key: "${key}"`);
      
      // Extract businessType from the key (format: "businessType.role.category.version")
      const keyParts = key.split('.');
      const businessType = keyParts[0] || 'general';
      
      console.log(`RAG: Extracted businessType: "${businessType}" from key: "${key}"`);
      
      const result = await this.dynamoClient.send(new GetCommand({
        TableName: tableNames.ragSystemInstructions,
        Key: { 
          key: key,
          businessType: businessType
        },
      }));
      console.log(`RAG: GetCommand result for key "${key}":`, result.Item ? 'Found' : 'Not found');
      return (result as any).Item || null;
    } catch (error) {
      console.error(`RAG: Error getting system instruction by key "${key}":`, error);
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
      // FIXED: Use Scan with FilterExpression since businessType is not a key attribute
      const result = await this.dynamoClient.send(new ScanCommand({
        TableName: tableNames.ragSystemInstructions,
        FilterExpression: 'businessType = :businessType',
        ExpressionAttributeValues: {
          ':businessType': businessType,
        },
        Limit: 50 // CRITICAL: Limit scan results to prevent memory issues
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
      
      // CRITICAL FIX: Sanitize memory object to prevent memory leaks
      const sanitizedMemory = this.sanitizeMemoryObject(memory);
      
      await this.dynamoClient.send(new PutCommand({
        TableName: tableNames.ragDynamicBusiness,
        Item: { 
          memoryKey,
          businessId,
          businessType,
          action,
          ...sanitizedMemory, 
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
      
      // CRITICAL FIX: Sanitize memory object to prevent memory leaks
      const sanitizedMemory = this.sanitizeMemoryObject(memory);
      
      await this.dynamoClient.send(new PutCommand({
        TableName: tableNames.ragDynamicUser,
        Item: { 
          memoryKey,
          businessId,
          userId,
          platform,
          ...sanitizedMemory, 
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
      // CRITICAL FIX: Add limit to prevent memory issues with SCAN operation
      const result = await this.dynamoClient.send(new ScanCommand({
        TableName: tableNames.ragDynamicUser,
        FilterExpression: 'businessId = :businessId AND userId = :userId',
        ExpressionAttributeValues: {
          ':businessId': businessId,
          ':userId': userId
        },
        Limit: 10 // CRITICAL: Limit scan results to prevent memory issues
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

  // CRITICAL: Sanitize memory objects to prevent memory leaks
  private sanitizeMemoryObject(memory: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(memory)) {
      if (value === null || value === undefined) {
        continue; // Skip null/undefined values
      }
      
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        // Limit array size and sanitize each element
        sanitized[key] = value.slice(0, 10).map(item => {
          if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
            return item;
          } else if (typeof item === 'object' && item !== null) {
            // For objects, only keep simple properties
            const simpleObj: Record<string, any> = {};
            for (const [objKey, objValue] of Object.entries(item)) {
              if (typeof objValue === 'string' || typeof objValue === 'number' || typeof objValue === 'boolean') {
                simpleObj[objKey] = objValue;
              }
            }
            return simpleObj;
          }
          return String(item); // Convert complex objects to strings
        });
      } else if (typeof value === 'object') {
        // For objects, only keep simple properties and limit depth
        const simpleObj: Record<string, any> = {};
        for (const [objKey, objValue] of Object.entries(value)) {
          if (typeof objValue === 'string' || typeof objValue === 'number' || typeof objValue === 'boolean') {
            simpleObj[objKey] = objValue;
          } else if (Array.isArray(objValue)) {
            // Limit array size
            simpleObj[objKey] = objValue.slice(0, 5).map(item => 
              typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean' 
                ? item 
                : String(item)
            );
          }
        }
        sanitized[key] = simpleObj;
      } else {
        // Convert everything else to string
        sanitized[key] = String(value);
      }
    }
    
    return sanitized;
  }

  // Operator-specific extraction methods
  private formatOperatorInstruction(instructionsJson: any): string {
    if (typeof instructionsJson === 'string') {
      return instructionsJson;
    }
    
    if (instructionsJson.routing) {
      return `Rutează cererile către frontend sau baza de date în funcție de cuvintele cheie: ${JSON.stringify(instructionsJson.routing)}`;
    }
    
    if (instructionsJson.identify_existing) {
      return `Identifică înregistrările existente folosind câmpurile: ${JSON.stringify(instructionsJson.identify_existing)}`;
    }
    
    return JSON.stringify(instructionsJson);
  }

  private extractOperatorWorkflow(instructionsJson: any): WorkflowStep[] {
    const workflow: WorkflowStep[] = [];
    
    if (instructionsJson.routing?.reservation_keywords) {
      workflow.push({
        step: 1,
        action: 'identify_reservation_request',
        description: 'Identifică cererile de rezervare',
        validation: 'has_reservation_keywords'
      });
    }
    
    if (instructionsJson.routing?.external_api_keywords) {
      workflow.push({
        step: 2,
        action: 'route_to_external_api',
        description: 'Rutează către API-uri externe',
        apiCall: {
          method: 'POST',
          endpoint: '/external-api',
          dataTemplate: '{"message": "{message}", "type": "external_api"}'
        }
      });
    }
    
    return workflow;
  }

  private extractOperatorPermissions(instructionsJson: any): string[] {
    const permissions = ['agent_access', 'data_query'];
    
    if (instructionsJson.routing?.external_api_keywords) {
      permissions.push('external_api_access');
    }
    
    if (instructionsJson.identify_existing?.resourceTypes) {
      permissions.push('resource_access');
    }
    
    return permissions;
  }

  private extractOperatorEndpoints(instructionsJson: any): string[] {
    const endpoints = [];
    
    if (instructionsJson.routing?.external_api_keywords) {
      endpoints.push('/external-api/sms', '/external-api/email', '/external-api/whatsapp');
    }
    
    if (instructionsJson.identify_existing?.resourceTypes) {
      endpoints.push('/resources/query', '/resources/update');
    }
    
    return endpoints;
  }

  private extractOperatorSuccessCriteria(instructionsJson: any): string[] {
    const criteria = [];
    
    if (instructionsJson.defaults?.needsHumanApprovalFor) {
      criteria.push('human_approval_handled');
    }
    
    if (instructionsJson.fallback?.on_no_rag) {
      criteria.push('fallback_handled');
    }
    
    return criteria;
  }

  private extractOperatorNotificationTemplate(instructionsJson: any): string {
    return 'Operator a procesat cererea cu succes. Rezultat: {result}';
  }

  private extractOperatorExamples(instructionsJson: any): string[] {
    const examples = [];
    
    if (instructionsJson.routing?.reservation_keywords) {
      examples.push('Cuvinte cheie pentru rezervări: ' + instructionsJson.routing.reservation_keywords.join(', '));
    }
    
    if (instructionsJson.routing?.resource_update_keywords) {
      examples.push('Cuvinte cheie pentru actualizări: ' + instructionsJson.routing.resource_update_keywords.join(', '));
    }
    
    return examples;
  }

  private extractOperatorKeywords(instructionsJson: any): string[] {
    const keywords = [];
    
    if (instructionsJson.routing?.reservation_keywords) {
      keywords.push(...instructionsJson.routing.reservation_keywords);
    }
    
    if (instructionsJson.routing?.resource_update_keywords) {
      keywords.push(...instructionsJson.routing.resource_update_keywords);
    }
    
    if (instructionsJson.routing?.external_api_keywords) {
      keywords.push(...instructionsJson.routing.external_api_keywords);
    }
    
    return keywords;
  }

  // Customer-specific extraction methods
  private formatCustomerInstruction(instructionsJson: any): string {
    if (typeof instructionsJson === 'string') {
      return instructionsJson;
    }
    
    if (instructionsJson.identify_existing) {
      return `Identifică clienții existenți folosind câmpurile: ${JSON.stringify(instructionsJson.identify_existing)}`;
    }
    
    if (instructionsJson.on_not_found) {
      return `Pentru clienți noi, colectează câmpurile: ${JSON.stringify(instructionsJson.on_not_found)}`;
    }
    
    return JSON.stringify(instructionsJson);
  }

  private extractCustomerWorkflow(instructionsJson: any): WorkflowStep[] {
    const workflow: WorkflowStep[] = [];
    
    if (instructionsJson.identify_existing?.probe_fields) {
      workflow.push({
        step: 1,
        action: 'identify_existing_customer',
        description: 'Identifică clienții existenți',
        validation: 'has_customer_fields'
      });
    }
    
    if (instructionsJson.on_not_found?.collect_fields) {
      workflow.push({
        step: 2,
        action: 'collect_customer_data',
        description: 'Colectează datele clientului nou',
        validation: 'has_required_fields'
      });
    }
    
    return workflow;
  }

  private extractCustomerPermissions(instructionsJson: any): string[] {
    const permissions = ['customer_access', 'booking_access'];
    
    if (instructionsJson.identify_existing?.resourceTypes) {
      permissions.push('customer_lookup');
    }
    
    if (instructionsJson.on_not_found?.collect_fields) {
      permissions.push('customer_creation');
    }
    
    return permissions;
  }

  private extractCustomerEndpoints(instructionsJson: any): string[] {
    const endpoints = [];
    
    if (instructionsJson.identify_existing?.resourceTypes) {
      endpoints.push('/customers/search', '/customers/lookup');
    }
    
    if (instructionsJson.on_not_found?.collect_fields) {
      endpoints.push('/customers/create', '/bookings/create');
    }
    
    return endpoints;
  }

  private extractCustomerSuccessCriteria(instructionsJson: any): string[] {
    const criteria = [];
    
    if (instructionsJson.identify_existing?.probe_fields) {
      criteria.push('customer_identified');
    }
    
    if (instructionsJson.on_not_found?.collect_fields) {
      criteria.push('customer_data_collected');
    }
    
    return criteria;
  }

  private extractCustomerNotificationTemplate(instructionsJson: any): string {
    return 'Client a fost procesat cu succes. Următorul pas: {next_step}';
  }

  private extractCustomerExamples(instructionsJson: any): string[] {
    const examples = [];
    
    if (instructionsJson.identify_existing?.probe_fields) {
      examples.push('Câmpuri pentru identificare: ' + instructionsJson.identify_existing.probe_fields.join(', '));
    }
    
    if (instructionsJson.on_not_found?.collect_fields) {
      examples.push('Câmpuri pentru clienți noi: ' + instructionsJson.on_not_found.collect_fields.join(', '));
    }
    
    return examples;
  }

  private extractCustomerKeywords(instructionsJson: any): string[] {
    const keywords = [];
    
    if (instructionsJson.identify_existing?.probe_fields) {
      keywords.push(...instructionsJson.identify_existing.probe_fields);
    }
    
    if (instructionsJson.on_not_found?.collect_fields) {
      keywords.push(...instructionsJson.on_not_found.collect_fields);
    }
    
    return keywords;
  }
} 