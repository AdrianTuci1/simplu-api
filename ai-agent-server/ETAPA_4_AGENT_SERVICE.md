# ETAPA 4: Agent Service cu LangChain și Gemini

## Obiectiv
Implementarea Agent Service-ului cu LangChain, LangGraph și Gemini 2.5 Flash pentru procesarea inteligentă a mesajelor.

## Durată Estimată: 6-7 zile

### 4.1 Interfețe și Tipuri pentru Agent
```typescript
// src/modules/agent/interfaces/agent.interface.ts
export interface AgentState {
  // Input
  businessId: string;
  locationId: string;
  userId: string;
  message: string;
  sessionId: string;
  source: 'websocket' | 'webhook' | 'cron';

  // Context
  businessInfo: BusinessInfo | null;
  ragResults: RagResult[];
  resourceOperations: ResourceOperation[];
  externalApiResults: ExternalApiResult[];

  // Logică
  needsResourceSearch: boolean;
  needsExternalApi: boolean;
  needsHumanApproval: boolean;

  // Output
  response: string;
  actions: AgentAction[];
}

export interface Intent {
  action: 'rezervare' | 'servicii' | 'clienti' | 'membrii' | 'stock-uri' | 'analiza_date' | 'sms' | 'email' | 'whatsapp';
  category: 'booking' | 'customer_service' | 'inventory' | 'analysis' | 'communication';
  confidence: number;
  canHandleAutonomously: boolean;
  requiresHumanApproval: boolean;
}

export interface WebhookData {
  businessId: string;
  locationId: string;
  userId: string;
  message: string;
  source: 'meta' | 'twilio' | 'email';
  externalId?: string;
  sessionId?: string;
}

export interface AutonomousActionResult {
  success: boolean;
  workflowResults: WorkflowStepResult[];
  notification: string;
  shouldRespond: boolean;
  response?: string;
}

export interface WorkflowStepResult {
  step: number;
  action: string;
  success: boolean;
  data: any;
  timestamp: string;
}

export interface WorkflowContext {
  webhookData: WebhookData;
  businessInfo: BusinessInfo;
  locationInfo: LocationInfo;
  intent: Intent;
}
```

### 4.2 Agent Service Principal
```typescript
// src/modules/agent/agent.service.ts
import { Injectable } from '@nestjs/common';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { StateGraph } from 'langgraph';
import { HumanMessage } from '@langchain/core/messages';
import { geminiConfig } from '@/config/gemini.config';
import { BusinessInfoService } from '../business-info/business-info.service';
import { RagService } from '../rag/rag.service';
import { SessionService } from '../session/session.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { 
  AgentState, 
  Intent, 
  WebhookData, 
  AutonomousActionResult,
  WorkflowContext 
} from './interfaces/agent.interface';
import { MessageDto, AgentResponse } from '@/shared/interfaces/message.interface';

@Injectable()
export class AgentService {
  private geminiModel: ChatGoogleGenerativeAI;
  private graph: StateGraph<AgentState>;

  constructor(
    private readonly businessInfoService: BusinessInfoService,
    private readonly ragService: RagService,
    private readonly sessionService: SessionService,
    private readonly websocketGateway: WebSocketGateway
  ) {
    this.initializeGemini();
    this.setupGraph();
  }

  // Procesare mesaje de la WebSocket (coordonatori)
  async processMessage(data: MessageDto): Promise<AgentResponse> {
    const state: AgentState = {
      businessId: data.businessId,
      locationId: data.locationId,
      userId: data.userId,
      message: data.message,
      sessionId: data.sessionId || this.generateSessionId(data),
      source: 'websocket',
      businessInfo: null,
      ragResults: [],
      resourceOperations: [],
      externalApiResults: [],
      needsResourceSearch: false,
      needsExternalApi: false,
      needsHumanApproval: false,
      response: '',
      actions: []
    };

    // Executare graful LangGraph
    const result = await this.graph.invoke(state);
    
    return {
      responseId: this.generateResponseId(),
      message: result.response,
      actions: result.actions,
      timestamp: new Date().toISOString(),
      sessionId: result.sessionId
    };
  }

  // Procesare autonomă pentru webhook-uri
  async processWebhookMessage(webhookData: WebhookData): Promise<AutonomousActionResult> {
    // 1. Analiză mesaj cu Gemini pentru a determina intenția
    const intent = await this.analyzeIntent(webhookData.message, webhookData.businessId);
    
    // 2. Determinare dacă poate fi rezolvat autonom
    if (this.canHandleAutonomously(intent)) {
      return await this.processAutonomously(webhookData);
    } else {
      // 3. Dacă nu poate fi rezolvat autonom, trimite la coordonator
      return await this.escalateToCoordinator(webhookData, intent);
    }
  }

  // Procesare autonomă completă
  async processAutonomously(webhookData: WebhookData): Promise<AutonomousActionResult> {
    // 1. Obținere business info
    const businessInfo = await this.businessInfoService.getBusinessInfo(webhookData.businessId);
    const locationInfo = await this.businessInfoService.getLocationInfo(webhookData.businessId, webhookData.locationId);
    
    // 2. Analiză intenție cu Gemini
    const intent = await this.analyzeIntent(webhookData.message, businessInfo.businessType);
    
    // 3. Obținere instrucțiuni RAG
    const instructions = await this.ragService.getInstructionsForRequest(
      intent.action,
      businessInfo.businessType,
      { category: intent.category, source: webhookData.source }
    );
    
    if (instructions.length === 0) {
      return {
        success: false,
        workflowResults: [],
        notification: 'Nu am găsit instrucțiuni pentru această cerere',
        shouldRespond: true,
        response: 'Îmi pare rău, dar nu pot procesa această cerere automat. Vă rog să contactați un coordonator.'
      };
    }
    
    // 4. Executare workflow autonom
    const result = await this.executeWorkflow(instructions[0], {
      webhookData,
      businessInfo,
      locationInfo,
      intent
    });
    
    // 5. Marcare conversație ca rezolvată dacă succes
    if (result.success && webhookData.sessionId) {
      await this.sessionService.markConversationResolved(webhookData.sessionId);
    }
    
    // 6. Notificare coordonator prin WebSocket
    await this.notifyCoordinator(result, webhookData.businessId, webhookData.locationId);
    
    return result;
  }

  private async analyzeIntent(message: string, businessType: string): Promise<Intent> {
    const prompt = `
    Analizează mesajul și determină intenția utilizatorului pentru un business de tip ${businessType}.
    
    Mesaj: "${message}"
    
    Returnează un JSON cu:
    {
      "action": "rezervare|servicii|clienti|membrii|stock-uri|analiza_date|sms|email|whatsapp",
      "category": "booking|customer_service|inventory|analysis|communication",
      "confidence": 0.95,
      "canHandleAutonomously": true,
      "requiresHumanApproval": false
    }
    `;

    try {
      const response = await this.geminiModel.invoke([new HumanMessage(prompt)]);
      return JSON.parse(response.content as string);
    } catch (error) {
      console.error('Error analyzing intent:', error);
      return {
        action: 'servicii',
        category: 'customer_service',
        confidence: 0.5,
        canHandleAutonomously: false,
        requiresHumanApproval: true
      };
    }
  }

  private canHandleAutonomously(intent: Intent): boolean {
    return intent.canHandleAutonomously && intent.confidence > 0.8;
  }

  private async executeWorkflow(
    instruction: any,
    context: WorkflowContext
  ): Promise<AutonomousActionResult> {
    const workflow = instruction.workflow;
    const results: WorkflowStepResult[] = [];
    
    for (const step of workflow) {
      try {
        // Executare pas workflow
        const stepResult = await this.executeWorkflowStep(step, context);
        results.push(stepResult);
        
        // Verificare validare
        if (step.validation && !this.validateStep(stepResult, step.validation)) {
          throw new Error(`Validation failed for step ${step.step}`);
        }
        
        // Actualizare context pentru următorul pas
        context = this.updateContext(context, stepResult);
        
      } catch (error) {
        console.error(`Error in workflow step ${step.step}:`, error);
        const errorResult: WorkflowStepResult = {
          step: step.step,
          action: step.action,
          success: false,
          data: { error: error.message },
          timestamp: new Date().toISOString()
        };
        results.push(errorResult);
        
        if (step.errorHandling === 'stop') {
          break;
        }
      }
    }
    
    // Verificare criteriile de succes
    const success = this.checkSuccessCriteria(results, instruction.successCriteria);
    
    return {
      success,
      workflowResults: results,
      notification: this.generateNotification(instruction, results, context),
      shouldRespond: success,
      response: success ? this.generateSuccessResponse(instruction, results, context) : 
                        this.generateErrorResponse(results, context)
    };
  }

  private async executeWorkflowStep(
    step: any,
    context: WorkflowContext
  ): Promise<WorkflowStepResult> {
    // Pentru moment, simulăm execuția pașilor
    // În etapa următoare vom integra cu Resources Service
    
    if (step.action === 'extract_reservation_details') {
      // Simulare extragere detalii cu Gemini
      const extractedData = await this.extractDataWithGemini(context.webhookData.message, 'reservation');
      
      return {
        step: step.step,
        action: step.action,
        success: true,
        data: extractedData,
        timestamp: new Date().toISOString()
      };
    }
    
    if (step.action === 'create_reservation') {
      // Simulare creare rezervare
      return {
        step: step.step,
        action: step.action,
        success: true,
        data: { reservationId: `res_${Date.now()}` },
        timestamp: new Date().toISOString()
      };
    }
    
    // Pași default
    return {
      step: step.step,
      action: step.action,
      success: true,
      data: { message: `Executed ${step.action}` },
      timestamp: new Date().toISOString()
    };
  }

  private async extractDataWithGemini(message: string, dataType: string): Promise<any> {
    const prompt = `
    Extrage datele relevante din mesaj pentru ${dataType}.
    
    Mesaj: "${message}"
    
    Returnează un JSON cu datele extrase.
    `;

    try {
      const response = await this.geminiModel.invoke([new HumanMessage(prompt)]);
      return JSON.parse(response.content as string);
    } catch (error) {
      console.error('Error extracting data:', error);
      return {};
    }
  }

  private validateStep(stepResult: WorkflowStepResult, validation: string): boolean {
    // Implementare validări simple
    switch (validation) {
      case 'has_date_and_service':
        return stepResult.data.date && stepResult.data.service;
      case 'reservation_created':
        return stepResult.success && stepResult.data.reservationId;
      default:
        return stepResult.success;
    }
  }

  private updateContext(context: WorkflowContext, stepResult: WorkflowStepResult): WorkflowContext {
    // Actualizare context cu rezultatele pasului
    return {
      ...context,
      // Adăugare date extrase în context
    };
  }

  private checkSuccessCriteria(results: WorkflowStepResult[], criteria: string[]): boolean {
    return criteria.every(criterion => 
      results.some(result => 
        result.success && this.matchesCriterion(result, criterion)
      )
    );
  }

  private matchesCriterion(result: WorkflowStepResult, criterion: string): boolean {
    // Implementare verificare criterii
    return result.action.includes(criterion.replace('_', ''));
  }

  private generateNotification(
    instruction: any,
    results: WorkflowStepResult[],
    context: WorkflowContext
  ): string {
    const template = instruction.notificationTemplate;
    
    // Populare template cu datele din rezultate
    return template
      .replace('{data}', new Date().toLocaleDateString('ro-RO'))
      .replace('{utilizatorul}', context.webhookData.userId)
      .replace('{business}', context.businessInfo.businessName)
      .replace('{action}', results[0]?.action || 'acțiune')
      .replace('{source}', context.webhookData.source);
  }

  private generateSuccessResponse(
    instruction: any,
    results: WorkflowStepResult[],
    context: WorkflowContext
  ): string {
    // Generare răspuns de succes cu Gemini
    const prompt = `
    Generează un răspuns de succes pentru utilizator.
    
    Acțiunea: ${instruction.instruction}
    Rezultate: ${JSON.stringify(results)}
    Business: ${context.businessInfo.businessName}
    
    Răspunsul trebuie să fie:
    - Prietenos și profesional
    - În limba română
    - Să confirme că acțiunea a fost realizată cu succes
    - Să nu depășească 100 de cuvinte
    `;

    try {
      const response = this.geminiModel.invoke([new HumanMessage(prompt)]);
      return (response as any).content || 'Acțiunea a fost realizată cu succes!';
    } catch (error) {
      return 'Acțiunea a fost realizată cu succes!';
    }
  }

  private generateErrorResponse(
    results: WorkflowStepResult[],
    context: WorkflowContext
  ): string {
    return 'Îmi pare rău, dar am întâmpinat o problemă la procesarea cererii. Vă rog să contactați un coordonator.';
  }

  private async notifyCoordinator(
    result: AutonomousActionResult,
    businessId: string,
    locationId: string
  ): Promise<void> {
    const notification = {
      type: 'autonomous_action_completed',
      businessId,
      locationId,
      timestamp: new Date().toISOString(),
      action: result.workflowResults[0]?.action,
      success: result.success,
      details: result.notification,
      source: 'autonomous_agent'
    };
    
    // Trimitere către toți coordonatorii business-ului
    this.websocketGateway.broadcastToBusiness(businessId, 'coordinator_notification', notification);
  }

  private async escalateToCoordinator(
    webhookData: WebhookData,
    intent: Intent
  ): Promise<AutonomousActionResult> {
    // Trimitere notificare către coordonatori
    const escalationNotification = {
      type: 'escalation_required',
      businessId: webhookData.businessId,
      locationId: webhookData.locationId,
      userId: webhookData.userId,
      message: webhookData.message,
      intent: intent,
      timestamp: new Date().toISOString()
    };

    this.websocketGateway.broadcastToBusiness(
      webhookData.businessId, 
      'escalation_required', 
      escalationNotification
    );

    return {
      success: false,
      workflowResults: [],
      notification: 'Cererea a fost escaladată către un coordonator',
      shouldRespond: true,
      response: 'Cererea dvs. a fost transmisă unui coordonator care vă va contacta în curând.'
    };
  }

  private initializeGemini(): void {
    this.geminiModel = new ChatGoogleGenerativeAI({
      modelName: geminiConfig.modelName,
      maxOutputTokens: geminiConfig.maxOutputTokens,
      temperature: geminiConfig.temperature,
      topP: geminiConfig.topP,
      topK: geminiConfig.topK,
      safetySettings: geminiConfig.safetySettings
    });
  }

  private setupGraph(): void {
    this.graph = new StateGraph<AgentState>({
      channels: {
        businessInfo: {},
        ragResults: {},
        resourceOperations: {},
        externalApis: {},
        response: {}
      }
    });

    // Adăugare noduri cu Gemini integration
    this.graph.addNode('business-info', new BusinessInfoNode(this.businessInfoService));
    this.graph.addNode('rag-search', new RagSearchNode(this.geminiModel, this.ragService));
    this.graph.addNode('resource-operations', new ResourceOperationsNode(this.geminiModel));
    this.graph.addNode('external-apis', new ExternalApiNode(this.geminiModel));
    this.graph.addNode('response', new ResponseNode(this.geminiModel));

    // Definirea fluxului
    this.graph.setEntryPoint('business-info');
    this.graph.addEdge('business-info', 'rag-search');
    this.graph.addConditionalEdges('rag-search', this.shouldSearchResources);
    this.graph.addEdge('rag-search', 'resource-operations');
    this.graph.addConditionalEdges('resource-operations', this.shouldCallExternalApis);
    this.graph.addEdge('resource-operations', 'external-apis');
    this.graph.addEdge('external-apis', 'response');
  }

  private shouldSearchResources(state: AgentState): string {
    return state.needsResourceSearch ? 'resource-operations' : 'response';
  }

  private shouldCallExternalApis(state: AgentState): string {
    return state.needsExternalApi ? 'external-apis' : 'response';
  }

  private generateResponseId(): string {
    return `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(data: MessageDto): string {
    return `${data.businessId}:${data.userId}:${Date.now()}`;
  }
}

// src/modules/agent/agent.module.ts
import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { BusinessInfoModule } from '../business-info/business-info.module';
import { RagModule } from '../rag/rag.module';
import { SessionModule } from '../session/session.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    BusinessInfoModule,
    RagModule,
    SessionModule,
    WebSocketModule,
  ],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
```

### 4.3 Noduri LangGraph
```typescript
// src/modules/agent/langchain/nodes/business-info.node.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { BusinessInfoService } from '../../business-info/business-info.service';
import { AgentState } from '../interfaces/agent.interface';

export class BusinessInfoNode {
  constructor(private businessInfoService: BusinessInfoService) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    const businessInfo = await this.businessInfoService.getBusinessInfo(state.businessId);
    
    return {
      businessInfo
    };
  }
}

// src/modules/agent/langchain/nodes/rag-search.node.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';
import { RagService } from '../../rag/rag.service';
import { AgentState } from '../interfaces/agent.interface';

export class RagSearchNode {
  constructor(
    private geminiModel: ChatGoogleGenerativeAI,
    private ragService: RagService
  ) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    const prompt = `
    Analizează mesajul utilizatorului și determină ce informații sunt necesare din baza de date RAG.
    
    Mesaj utilizator: ${state.message}
    Tip business: ${state.businessInfo?.businessType}
    Context: ${JSON.stringify(state.businessInfo?.metadata)}
    
    Generează o interogare optimizată pentru căutarea în baza de date RAG.
    Returnează doar interogarea, fără explicații suplimentare.
    `;

    const response = await this.geminiModel.invoke([new HumanMessage(prompt)]);
    const query = response.content as string;

    // Executare căutare RAG
    const ragResults = await this.ragService.getInstructionsForRequest(
      query,
      state.businessInfo?.businessType || 'general',
      state.businessInfo?.metadata || {}
    );

    return {
      ragResults,
      needsResourceSearch: this.shouldSearchResources(state.message, ragResults)
    };
  }

  private shouldSearchResources(message: string, ragResults: any[]): boolean {
    // Logică pentru determinarea dacă sunt necesare operații pe resurse
    const resourceKeywords = ['creează', 'modifică', 'șterge', 'rezervă', 'programează'];
    return resourceKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }
}

// src/modules/agent/langchain/nodes/resource-operations.node.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../interfaces/agent.interface';

export class ResourceOperationsNode {
  constructor(private geminiModel: ChatGoogleGenerativeAI) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    const prompt = `
    Analizează mesajul utilizatorului și contextul pentru a determina ce operații pe resurse sunt necesare.
    
    Mesaj: ${state.message}
    Business Info: ${JSON.stringify(state.businessInfo)}
    RAG Results: ${JSON.stringify(state.ragResults)}
    
    Generează o listă de operații pe resurse în format JSON:
    {
      "operations": [
        {
          "type": "create|update|delete|get",
          "resourceType": "appointments|customers|services",
          "data": {},
          "priority": "high|medium|low"
        }
      ]
    }
    `;

    const response = await this.geminiModel.invoke([new HumanMessage(prompt)]);
    const operations = JSON.parse(response.content as string);

    // Pentru moment, simulăm operațiile
    const results = operations.operations.map((op: any) => ({
      operation: op,
      result: { success: true, data: { message: `Simulated ${op.type} operation` } }
    }));

    return {
      resourceOperations: results,
      needsExternalApi: this.shouldCallExternalApis(state.message, operations)
    };
  }

  private shouldCallExternalApis(message: string, operations: any): boolean {
    const externalKeywords = ['sms', 'email', 'whatsapp', 'notifică', 'trimite'];
    return externalKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }
}

// src/modules/agent/langchain/nodes/response.node.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../interfaces/agent.interface';

export class ResponseNode {
  constructor(private geminiModel: ChatGoogleGenerativeAI) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    const prompt = `
    Generează un răspuns natural și util pentru utilizator bazat pe contextul și operațiile efectuate.
    
    Mesaj original: ${state.message}
    Business: ${state.businessInfo?.businessName}
    Tip business: ${state.businessInfo?.businessType}
    Operații efectuate: ${JSON.stringify(state.resourceOperations)}
    Rezultate API externe: ${JSON.stringify(state.externalApiResults)}
    
    Răspunsul trebuie să fie:
    - Natural și prietenos
    - Specific pentru tipul de business
    - Să includă informații relevante din operațiile efectuate
    - Să fie în limba română
    - Să nu depășească 200 de cuvinte
    `;

    const response = await this.geminiModel.invoke([new HumanMessage(prompt)]);
    
    return {
      response: response.content as string,
      actions: this.extractActions(state)
    };
  }

  private extractActions(state: AgentState): any[] {
    const actions: any[] = [];
    
    // Adăugare acțiuni bazate pe operațiile efectuate
    state.resourceOperations.forEach(op => {
      if (op.result.success) {
        actions.push({
          type: 'resource_operation',
          status: 'success',
          details: op.result
        });
      }
    });

    state.externalApiResults.forEach(result => {
      actions.push({
        type: 'external_api_call',
        status: result.success ? 'success' : 'failed',
        details: result
      });
    });

    return actions;
  }
}

// src/modules/agent/langchain/nodes/external-api.node.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { AgentState } from '../interfaces/agent.interface';

export class ExternalApiNode {
  constructor(private geminiModel: ChatGoogleGenerativeAI) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    // Simulare apeluri API externe
    const externalApiResults = [
      {
        type: 'notification',
        success: true,
        data: { message: 'Notification sent successfully' }
      }
    ];

    return {
      externalApiResults
    };
  }
}
```

### 4.4 Actualizare WebSocket Gateway pentru Agent
```typescript
// src/modules/websocket/websocket.gateway.ts
// Adăugare în constructor și handleMessage

constructor(
  private readonly agentService: AgentService
) {}

@SubscribeMessage('message')
async handleMessage(
  @MessageBody() data: MessageDto,
  @ConnectedSocket() client: Socket
): Promise<void> {
  try {
    console.log(`Received message from ${data.userId} in business ${data.businessId}: ${data.message}`);
    
    // Procesare mesaj prin agent
    const response = await this.agentService.processMessage(data);
    
    // Trimitere răspuns către client
    client.emit('response', response);
    
    // Broadcast către toți coordonatorii business-ului (opțional)
    this.server.to(`business:${data.businessId}`).emit('message_processed', {
      userId: data.userId,
      message: data.message,
      responseId: response.responseId,
      timestamp: response.timestamp
    });
    
  } catch (error) {
    console.error('Error processing message:', error);
    client.emit('error', {
      message: 'Eroare la procesarea mesajului',
      error: error.message
    });
  }
}
```

### 4.5 Testare Agent Service
```typescript
// src/modules/agent/agent.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AgentService } from './agent.service';
import { BusinessInfoService } from '../business-info/business-info.service';
import { RagService } from '../rag/rag.service';
import { SessionService } from '../session/session.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';

describe('AgentService', () => {
  let service: AgentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        {
          provide: BusinessInfoService,
          useValue: {
            getBusinessInfo: jest.fn().mockResolvedValue({
              businessId: 'test-business',
              businessType: 'dental',
              businessName: 'Test Dental'
            })
          }
        },
        {
          provide: RagService,
          useValue: {
            getInstructionsForRequest: jest.fn().mockResolvedValue([])
          }
        },
        {
          provide: SessionService,
          useValue: {
            markConversationResolved: jest.fn()
          }
        },
        {
          provide: WebSocketGateway,
          useValue: {
            broadcastToBusiness: jest.fn()
          }
        }
      ],
    }).compile();

    service = module.get<AgentService>(AgentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should process message and return response', async () => {
    const messageData = {
      businessId: 'test-business',
      locationId: 'test-location',
      userId: 'test-user',
      message: 'Vreau să fac o rezervare'
    };

    const response = await service.processMessage(messageData);
    
    expect(response).toBeDefined();
    expect(response.responseId).toBeDefined();
    expect(response.message).toBeDefined();
    expect(response.sessionId).toBeDefined();
  });

  it('should analyze intent correctly', async () => {
    const intent = await (service as any).analyzeIntent('Vreau să fac o rezervare', 'dental');
    
    expect(intent).toBeDefined();
    expect(intent.action).toBeDefined();
    expect(intent.confidence).toBeGreaterThan(0);
  });
});
```

### 4.6 Actualizare App Module
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
import { AgentModule } from './modules/agent/agent.module';

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
    AgentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

## Deliverables Etapa 4
- [ ] Agent Service implementat cu LangChain și Gemini
- [ ] Noduri LangGraph pentru procesarea mesajelor
- [ ] Funcționalitate autonomă pentru webhook-uri
- [ ] Analiză intenții cu Gemini
- [ ] Executare workflow-uri bazate pe instrucțiuni RAG
- [ ] Notificări către coordonatori prin WebSocket
- [ ] Testare pentru Agent Service
- [ ] Integrare completă în sistem

## Următoarea Etapă
După finalizarea acestei etape, vei trece la **ETAPA 5: Resources Service și External APIs**. 