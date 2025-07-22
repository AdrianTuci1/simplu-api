# ETAPA 3: Business Info Service și RAG Service

## Obiectiv
Implementarea serviciilor pentru obținerea informațiilor despre business și sistemul RAG cu instrucțiuni pentru agent.

## Durată Estimată: 5-6 zile

### 3.1 Business Info Service
```typescript
// src/modules/business-info/business-info.service.ts
import { Injectable } from '@nestjs/common';
import { DynamoDBClient, GetCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamoDBClient, tableNames } from '@/config/dynamodb.config';

export interface BusinessInfo {
  businessId: string;
  businessName: string;
  businessType: 'dental' | 'gym' | 'hotel';
  locations: LocationInfo[];
  settings: BusinessSettings;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LocationInfo {
  locationId: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  timezone: string;
  isActive: boolean;
}

export interface BusinessSettings {
  currency: string;
  language: string;
  dateFormat: string;
  timeFormat: string;
  workingHours: {
    [day: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };
}

@Injectable()
export class BusinessInfoService {
  private dynamoClient = dynamoDBClient;

  async getBusinessInfo(businessId: string): Promise<BusinessInfo | null> {
    try {
      const command = new GetCommand({
        TableName: tableNames.businessInfo,
        Key: marshall({ businessId }),
      });

      const result = await this.dynamoClient.send(command);
      
      if (!result.Item) {
        return null;
      }

      return unmarshall(result.Item) as BusinessInfo;
    } catch (error) {
      console.error(`Error fetching business info for ${businessId}:`, error);
      
      // Return mock data as fallback for development
      return this.getMockBusinessInfo(businessId);
    }
  }

  async getLocationInfo(businessId: string, locationId: string): Promise<LocationInfo | null> {
    const businessInfo = await this.getBusinessInfo(businessId);
    
    if (!businessInfo) {
      return null;
    }

    return businessInfo.locations.find(loc => loc.locationId === locationId) || null;
  }

  async getBusinessLocations(businessId: string): Promise<LocationInfo[]> {
    const businessInfo = await this.getBusinessInfo(businessId);
    return businessInfo?.locations || [];
  }

  async getBusinessSettings(businessId: string): Promise<BusinessSettings | null> {
    const businessInfo = await this.getBusinessInfo(businessId);
    return businessInfo?.settings || null;
  }

  async getBusinessPermissions(businessId: string): Promise<string[]> {
    const businessInfo = await this.getBusinessInfo(businessId);
    return businessInfo?.permissions || [];
  }

  async getBusinessType(businessId: string): Promise<string> {
    const businessInfo = await this.getBusinessInfo(businessId);
    return businessInfo?.businessType || 'general';
  }

  /**
   * Mock data fallback for development when DynamoDB is not available
   */
  private getMockBusinessInfo(businessId: string): BusinessInfo {
    const businessTypes = ['dental', 'gym', 'hotel'] as const;
    const businessType = businessTypes[parseInt(businessId.slice(-1)) % 3];

    return {
      businessId,
      businessName: `Mock Business ${businessId}`,
      businessType,
      locations: [
        {
          locationId: `${businessId}-loc-1`,
          name: 'Locația Principală',
          address: 'Strada Exemplu, Nr. 123, București',
          phone: '+40712345678',
          email: 'contact@business.com',
          timezone: 'Europe/Bucharest',
          isActive: true
        }
      ],
      settings: {
        currency: 'RON',
        language: 'ro',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
        workingHours: {
          monday: { open: '09:00', close: '18:00', isOpen: true },
          tuesday: { open: '09:00', close: '18:00', isOpen: true },
          wednesday: { open: '09:00', close: '18:00', isOpen: true },
          thursday: { open: '09:00', close: '18:00', isOpen: true },
          friday: { open: '09:00', close: '18:00', isOpen: true },
          saturday: { open: '09:00', close: '14:00', isOpen: true },
          sunday: { open: '00:00', close: '00:00', isOpen: false }
        }
      },
      permissions: ['reservations:create', 'customers:read', 'services:read'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

// src/modules/business-info/business-info.module.ts
import { Module } from '@nestjs/common';
import { BusinessInfoService } from './business-info.service';

@Module({
  providers: [BusinessInfoService],
  exports: [BusinessInfoService],
})
export class BusinessInfoModule {}
```

### 3.2 RAG Service - Instrucțiuni pentru Agent
```typescript
// src/modules/rag/rag.service.ts
import { Injectable } from '@nestjs/common';
import { DynamoDBClient, QueryCommand, GetCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
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
  private dynamoClient = dynamoDBClient;

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
        Key: marshall({
          instructionId: `${businessType}-${category}`,
          businessType
        })
      }));

      return result.Item ? unmarshall(result.Item) as RagInstruction : null;
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
        ExpressionAttributeValues: marshall({
          ':businessType': businessType,
          ':isActive': true
        })
      }));

      const instructions = result.Items ? 
        result.Items.map(item => unmarshall(item) as RagInstruction) : [];

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

// src/modules/rag/rag.module.ts
import { Module } from '@nestjs/common';
import { RagService } from './rag.service';

@Module({
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
```

### 3.3 Date Inițiale RAG - Instrucțiuni pentru Diferite Business-uri
```typescript
// src/modules/rag/data/initial-instructions.ts
import { RagInstruction } from '../rag.service';

export const initialInstructions: RagInstruction[] = [
  // Instrucțiuni pentru rezervări dentale
  {
    instructionId: 'dental-reservation-001',
    businessType: 'dental',
    category: 'rezervare',
    instruction: 'Procesează o cerere de rezervare pentru cabinetul dental',
    workflow: [
      {
        step: 1,
        action: 'extract_reservation_details',
        description: 'Extrage data, ora și serviciul din mesaj',
        validation: 'has_date_and_service'
      },
      {
        step: 2,
        action: 'check_availability',
        description: 'Verifică disponibilitatea în sistem',
        apiCall: {
          method: 'GET',
          endpoint: '/resources/{businessId}/{locationId}/availability',
          dataTemplate: '{"date": "{date}", "serviceId": "{serviceId}"}'
        }
      },
      {
        step: 3,
        action: 'create_reservation',
        description: 'Creează rezervarea în sistem',
        apiCall: {
          method: 'POST',
          endpoint: '/resources/{businessId}/{locationId}/reservations',
          dataTemplate: '{"customerId": "{customerId}", "serviceId": "{serviceId}", "date": "{date}", "time": "{time}"}'
        },
        validation: 'reservation_created'
      },
      {
        step: 4,
        action: 'send_confirmation',
        description: 'Trimite confirmare prin canalul original',
        validation: 'confirmation_sent'
      }
    ],
    requiredPermissions: ['reservations:create', 'customers:read'],
    apiEndpoints: ['/reservations', '/availability', '/customers'],
    successCriteria: ['reservation_created', 'confirmation_sent'],
    notificationTemplate: 'Am preluat o rezervare în data de {data} pentru {utilizatorul} în urma unei conversații pe {source}',
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    metadata: {
      examples: [
        'Vreau să fac o programare pentru mâine',
        'Pot să rezerv o consultație pentru săptămâna viitoare?',
        'Am nevoie de o programare urgentă'
      ],
      keywords: ['rezervare', 'programare', 'consultație', 'programează', 'mâine'],
      confidence: 0.95
    }
  },

  // Instrucțiuni pentru servicii dentale
  {
    instructionId: 'dental-services-001',
    businessType: 'dental',
    category: 'servicii',
    instruction: 'Informează despre serviciile disponibile în cabinetul dental',
    workflow: [
      {
        step: 1,
        action: 'get_services',
        description: 'Obține lista serviciilor disponibile',
        apiCall: {
          method: 'GET',
          endpoint: '/resources/{businessId}/{locationId}/services',
          dataTemplate: '{}'
        }
      },
      {
        step: 2,
        action: 'format_services_response',
        description: 'Formatează răspunsul cu serviciile disponibile',
        validation: 'services_formatted'
      }
    ],
    requiredPermissions: ['services:read'],
    apiEndpoints: ['/services'],
    successCriteria: ['services_retrieved'],
    notificationTemplate: 'Am furnizat informații despre serviciile disponibile pentru {utilizatorul}',
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    metadata: {
      examples: [
        'Ce servicii oferiți?',
        'Care sunt prețurile pentru consultații?',
        'Vreau să știu despre tratamentele disponibile'
      ],
      keywords: ['servicii', 'prețuri', 'tratamente', 'consultații', 'ofere'],
      confidence: 0.90
    }
  },

  // Instrucțiuni pentru sală de fitness
  {
    instructionId: 'gym-membership-001',
    businessType: 'gym',
    category: 'membrii',
    instruction: 'Gestionează cereri pentru abonamente la sală',
    workflow: [
      {
        step: 1,
        action: 'extract_membership_request',
        description: 'Extrage detalii despre cererea de abonament',
        validation: 'has_membership_details'
      },
      {
        step: 2,
        action: 'check_membership_availability',
        description: 'Verifică disponibilitatea abonamentelor',
        apiCall: {
          method: 'GET',
          endpoint: '/resources/{businessId}/{locationId}/memberships',
          dataTemplate: '{"type": "{membershipType}"}'
        }
      },
      {
        step: 3,
        action: 'create_membership_request',
        description: 'Creează cererea de abonament',
        apiCall: {
          method: 'POST',
          endpoint: '/resources/{businessId}/{locationId}/membership-requests',
          dataTemplate: '{"customerId": "{customerId}", "membershipType": "{membershipType}", "startDate": "{startDate}"}'
        }
      }
    ],
    requiredPermissions: ['memberships:read', 'membership-requests:create'],
    apiEndpoints: ['/memberships', '/membership-requests'],
    successCriteria: ['membership_request_created'],
    notificationTemplate: 'Am procesat o cerere de abonament pentru {utilizatorul}',
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    metadata: {
      examples: [
        'Vreau să mă abonez la sală',
        'Care sunt tipurile de abonamente?',
        'Pot să fac un abonament pentru 3 luni?'
      ],
      keywords: ['abonament', 'sală', 'fitness', 'membru', 'înscriere'],
      confidence: 0.92
    }
  },

  // Instrucțiuni pentru hotel
  {
    instructionId: 'hotel-booking-001',
    businessType: 'hotel',
    category: 'rezervare',
    instruction: 'Procesează rezervări pentru camere de hotel',
    workflow: [
      {
        step: 1,
        action: 'extract_booking_details',
        description: 'Extrage detalii despre rezervare (data check-in, check-out, tip cameră)',
        validation: 'has_booking_details'
      },
      {
        step: 2,
        action: 'check_room_availability',
        description: 'Verifică disponibilitatea camerelor',
        apiCall: {
          method: 'GET',
          endpoint: '/resources/{businessId}/{locationId}/rooms/availability',
          dataTemplate: '{"checkIn": "{checkIn}", "checkOut": "{checkOut}", "roomType": "{roomType}"}'
        }
      },
      {
        step: 3,
        action: 'create_booking',
        description: 'Creează rezervarea',
        apiCall: {
          method: 'POST',
          endpoint: '/resources/{businessId}/{locationId}/bookings',
          dataTemplate: '{"customerId": "{customerId}", "roomId": "{roomId}", "checkIn": "{checkIn}", "checkOut": "{checkOut}"}'
        }
      }
    ],
    requiredPermissions: ['bookings:create', 'rooms:read'],
    apiEndpoints: ['/rooms', '/bookings'],
    successCriteria: ['booking_created'],
    notificationTemplate: 'Am procesat o rezervare de cameră pentru {utilizatorul}',
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    metadata: {
      examples: [
        'Vreau să rezerv o cameră pentru weekend',
        'Aveți camere disponibile pentru 2 persoane?',
        'Pot să fac o rezervare pentru săptămâna viitoare?'
      ],
      keywords: ['rezervare', 'cameră', 'hotel', 'check-in', 'check-out'],
      confidence: 0.94
    }
  }
];
```

### 3.4 Script pentru Popularea RAG cu Date Inițiale
```typescript
// src/modules/rag/scripts/populate-rag.ts
import { DynamoDBClient, PutCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { dynamoDBClient, tableNames } from '@/config/dynamodb.config';
import { initialInstructions } from '../data/initial-instructions';

export async function populateRagInstructions() {
  const dynamoClient = dynamoDBClient;
  
  console.log('Starting RAG instructions population...');
  
  for (const instruction of initialInstructions) {
    try {
      await dynamoClient.send(new PutCommand({
        TableName: tableNames.ragInstructions,
        Item: marshall(instruction)
      }));
      
      console.log(`✅ Added instruction: ${instruction.instructionId}`);
    } catch (error) {
      console.error(`❌ Error adding instruction ${instruction.instructionId}:`, error);
    }
  }
  
  console.log('RAG instructions population completed!');
}

// Rulare script
if (require.main === module) {
  populateRagInstructions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}
```

### 3.5 Testare Business Info Service
```typescript
// src/modules/business-info/business-info.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BusinessInfoService } from './business-info.service';

describe('BusinessInfoService', () => {
  let service: BusinessInfoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BusinessInfoService],
    }).compile();

    service = module.get<BusinessInfoService>(BusinessInfoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return mock business info when DynamoDB is not available', async () => {
    const businessInfo = await service.getBusinessInfo('test-business-1');
    
    expect(businessInfo).toBeDefined();
    expect(businessInfo.businessId).toBe('test-business-1');
    expect(businessInfo.businessType).toBeDefined();
    expect(businessInfo.locations).toHaveLength(1);
  });

  it('should return location info', async () => {
    const locationInfo = await service.getLocationInfo('test-business-1', 'test-business-1-loc-1');
    
    expect(locationInfo).toBeDefined();
    expect(locationInfo.locationId).toBe('test-business-1-loc-1');
    expect(locationInfo.isActive).toBe(true);
  });
});
```

### 3.6 Testare RAG Service
```typescript
// src/modules/rag/rag.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { RagService } from './rag.service';

describe('RagService', () => {
  let service: RagService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RagService],
    }).compile();

    service = module.get<RagService>(RagService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return instructions for dental reservation', async () => {
    const instructions = await service.getInstructionsForRequest(
      'Vreau să fac o rezervare pentru mâine',
      'dental',
      { category: 'rezervare' }
    );
    
    expect(instructions).toBeDefined();
    expect(instructions.length).toBeGreaterThan(0);
    expect(instructions[0].category).toBe('rezervare');
  });

  it('should return workflow for category', async () => {
    const workflow = await service.getWorkflowForCategory('rezervare', 'dental');
    
    expect(workflow).toBeDefined();
    expect(workflow.length).toBeGreaterThan(0);
    expect(workflow[0]).toHaveProperty('step');
    expect(workflow[0]).toHaveProperty('action');
  });
});
```

### 3.7 Actualizare App Module
```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { SessionModule } from './modules/session/session.module';
import { BusinessInfoModule } from './modules/business-info/business-info.module';
import { RagModule } from './modules/rag/rag.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    WebSocketModule,
    SessionModule,
    BusinessInfoModule,
    RagModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

## Deliverables Etapa 3
- [ ] Business Info Service implementat cu mock data fallback
- [ ] RAG Service cu instrucțiuni structurate
- [ ] Date inițiale pentru 3 tipuri de business (dental, gym, hotel)
- [ ] Workflow-uri pentru acțiuni comune (rezervări, servicii, membrii)
- [ ] Script pentru popularea RAG cu date inițiale
- [ ] Testare pentru ambele servicii
- [ ] Integrare în App Module

## Următoarea Etapă
După finalizarea acestei etape, vei trece la **ETAPA 4: Agent Service cu LangChain și Gemini**. 