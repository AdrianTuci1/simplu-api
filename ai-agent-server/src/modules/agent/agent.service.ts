import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, START, END } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
import { openaiConfig } from '@/config/openai.config';
import { BusinessInfoService } from '../business-info/business-info.service';
import { RagService } from '../rag/rag.service';
import { SessionService } from '../session/session.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { ResourcesService } from '../resources/resources.service';
import { ExternalApisService } from '../external-apis/external-apis.service';
import { 
  AgentState, 
  Intent, 
  WebhookData, 
  AutonomousActionResult,
  WorkflowContext 
} from './interfaces/agent.interface';
import { MessageDto, AgentResponse } from '@/shared/interfaces/message.interface';
import { BusinessInfoNode } from './langchain/nodes/business-info.node';
import { RagSearchNode } from './langchain/nodes/rag-search.node';
import { ResourceOperationsNode } from './langchain/nodes/resource-operations.node';
import { ExternalApiNode } from './langchain/nodes/external-api.node';
import { ResponseNode } from './langchain/nodes/response.node';
import { IdentificationNode } from './langchain/nodes/identification.node';
import { DynamicMemoryNode } from './langchain/nodes/dynamic-memory.node';
import { ResourcesIntrospectionNode } from './langchain/nodes/resources-introspection.node';
import { RagUpdateNode } from './langchain/nodes/rag-update.node';

@Injectable()
export class AgentService {
  private openaiModel: ChatOpenAI;
  private graphApp: any;

  constructor(
    private readonly businessInfoService: BusinessInfoService,
    private readonly ragService: RagService,
    private readonly sessionService: SessionService,
    @Inject(forwardRef(() => WebSocketGateway))
    private readonly websocketGateway: WebSocketGateway,
    private readonly resourcesService: ResourcesService,
    private readonly externalApisService: ExternalApisService
  ) {
    this.initializeOpenAI();
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
      role: undefined,
      businessInfo: null,
      ragResults: [],
      resourceOperations: [],
      externalApiResults: [],
      dynamicBusinessMemory: null,
      dynamicUserMemory: null,
      needsResourceSearch: false,
      needsExternalApi: false,
      needsHumanApproval: false,
      needsIntrospection: false,
      needsRagUpdate: false,
      response: '',
      actions: []
    };

    // Procesare cu LangGraph StateGraph
    try {
      const finalState = await this.graphApp.invoke(state);
      Object.assign(state, finalState);
      
      return {
        responseId: this.generateResponseId(),
        message: state.response,
        actions: state.actions,
        timestamp: new Date().toISOString(),
        sessionId: state.sessionId
      };
    } catch (error) {
      console.error('Error in LangGraph processing:', error);
      
      // Fallback la procesarea simplă
      const businessInfo = await this.businessInfoService.getBusinessInfo(state.businessId);
      const intent = await this.analyzeIntent(state.message, businessInfo?.businessType || 'general');
      const response = await this.generateResponse(state, intent);
      
      return {
        responseId: this.generateResponseId(),
        message: response,
        actions: [],
        timestamp: new Date().toISOString(),
        sessionId: state.sessionId
      };
    }
  }

  private setupGraph(): void {
    // Wrap existing nodes into runnable functions
    const identification = async (s: AgentState) => {
      const node = new IdentificationNode(this.openaiModel);
      return await node.invoke(s);
    };

    const businessInfo = async (s: AgentState) => {
      const node = new BusinessInfoNode(this.businessInfoService);
      return await node.invoke(s);
    };

    const dynamicMemory = async (s: AgentState) => {
      const node = new DynamicMemoryNode(this.ragService);
      return await node.invoke(s);
    };

    const ragSearch = async (s: AgentState) => {
      const node = new RagSearchNode(this.openaiModel, this.ragService);
      return await node.invoke(s);
    };

    const resourcesIntrospection = async (s: AgentState) => {
      const node = new ResourcesIntrospectionNode(this.openaiModel, this.resourcesService);
      return await node.invoke(s);
    };

    const ragUpdate = async (s: AgentState) => {
      const node = new RagUpdateNode(this.ragService);
      return await node.invoke(s);
    };

    const resourceOperations = async (s: AgentState) => {
      const node = new ResourceOperationsNode(this.openaiModel);
      return await node.invoke(s);
    };

    const externalApis = async (s: AgentState) => {
      const node = new ExternalApiNode(this.openaiModel);
      return await node.invoke(s);
    };

    const respond = async (s: AgentState) => {
      const node = new ResponseNode(this.openaiModel);
      return await node.invoke(s);
    };

    const routerFromRag = (s: AgentState): 'respond' | 'internal' | 'external' => {
      // If we already have a clear answer and no resource ops needed, respond
      if ((s.ragResults?.length || 0) > 0 && !s.needsResourceSearch) return 'respond';
      // Operator or needs introspection → internal path
      if (s.role === 'operator' || s.needsIntrospection) return 'internal';
      // Default external path
      return 'external';
    };

    const externalOpsOrRespond = (s: AgentState): 'resource_ops' | 'respond' => {
      return s.needsResourceSearch ? 'resource_ops' : 'respond';
    };

    const externalNeedApis = (s: AgentState): 'external_apis' | 'respond' => {
      return s.needsExternalApi ? 'external_apis' : 'respond';
    };

    // Build graph
    const graph: any = new StateGraph<AgentState>({ channels: {} as any });

    (graph as any).addNode('identify', identification);
    (graph as any).addNode('business_info', businessInfo);
    (graph as any).addNode('memory_load', dynamicMemory);
    (graph as any).addNode('rag_search', ragSearch);
    (graph as any).addNode('internal_introspection', resourcesIntrospection);
    (graph as any).addNode('rag_update', ragUpdate);
    (graph as any).addNode('resource_operations', resourceOperations);
    (graph as any).addNode('external_apis', externalApis);
    (graph as any).addNode('response', respond);

    (graph as any).addEdge(START, 'identify');
    (graph as any).addEdge('identify', 'business_info');
    (graph as any).addEdge('business_info', 'memory_load');
    (graph as any).addEdge('memory_load', 'rag_search');

    (graph as any).addConditionalEdges('rag_search', routerFromRag, {
      respond: 'response',
      internal: 'internal_introspection',
      external: 'resource_operations_router'
    } as any);

    // Router node for external path (virtual) by using conditional edges from a no-op node
    (graph as any).addNode('resource_operations_router', async (s: AgentState) => s);
    (graph as any).addConditionalEdges('resource_operations_router', externalOpsOrRespond, {
      resource_ops: 'resource_operations',
      respond: 'response'
    } as any);

    (graph as any).addConditionalEdges('resource_operations', externalNeedApis, {
      external_apis: 'external_apis',
      respond: 'response'
    } as any);

    (graph as any).addEdge('external_apis', 'response');

    // Internal path edges
    (graph as any).addEdge('internal_introspection', 'rag_update');
    (graph as any).addEdge('rag_update', 'response');

    (graph as any).addEdge('response', END);

    this.graphApp = graph.compile();
  }

  // Procesare autonomă pentru webhook-uri
  async processWebhookMessage(webhookData: WebhookData): Promise<AutonomousActionResult> {
    // 1. Analiză mesaj cu OpenAI pentru a determina intenția
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
    
    if (!businessInfo || !locationInfo) {
      return {
        success: false,
        workflowResults: [],
        notification: 'Business sau locație negăsit',
        shouldRespond: true,
        response: 'Îmi pare rău, dar nu am găsit informațiile despre business sau locație.'
      };
    }
    
    // 2. Analiză intenție cu OpenAI
    const intent = await this.analyzeIntent(webhookData.message, businessInfo.businessType);
    
    // 3. Obținere instrucțiuni RAG
    const instructions = await this.ragService.getInstructionsForRequest(
      intent.action,
      businessInfo.businessType,
      { category: intent.category, source: webhookData.source, settings: businessInfo.settings }
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
      const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
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
    const results: any[] = [];
    
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
        const errorResult = {
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
  ): Promise<any> {
    if (step.apiCall) {
      // Executare operație pe resurse
      const operation = {
        type: this.mapHttpMethodToOperationType(step.apiCall.method),
        resourceType: step.apiCall.endpoint.split('/').pop(),
        businessId: context.webhookData.businessId,
        locationId: context.webhookData.locationId,
        data: this.parseDataTemplate(step.apiCall.dataTemplate, context)
      };

      const result = await this.resourcesService.executeOperation(operation);
      
      return {
        step: step.step,
        action: step.action,
        success: result.success,
        data: result.data,
        timestamp: new Date().toISOString()
      };
    }

    if (step.action === 'send_confirmation') {
      // Trimitere confirmare prin canalul original
      const source = context.webhookData.source;
      const userId = context.webhookData.userId;
      const message = this.generateConfirmationMessage(context);

      let result;
      if (source === 'meta') {
        result = await this.externalApisService.sendMetaMessage(
          userId,
          message,
          context.webhookData.businessId
        );
      } else if (source === 'twilio') {
        result = await this.externalApisService.sendSMS(
          userId,
          message,
          context.webhookData.businessId
        );
      }

      return {
        step: step.step,
        action: step.action,
        success: result?.success || false,
        data: result,
        timestamp: new Date().toISOString()
      };
    }

    if (step.action === 'extract_reservation_details') {
      // Extragere detalii cu OpenAI
      const extractedData = await this.extractDataWithOpenAI(context.webhookData.message, 'reservation');
      
      return {
        step: step.step,
        action: step.action,
        success: true,
        data: extractedData,
        timestamp: new Date().toISOString()
      };
    }
    
    if (step.action === 'create_reservation') {
      // Creare rezervare prin Resources Service
      const reservationData = this.parseDataTemplate(step.dataTemplate, context);
      const result = await this.resourcesService.createReservation(
        context.webhookData.businessId,
        context.webhookData.locationId,
        reservationData
      );
      
      return {
        step: step.step,
        action: step.action,
        success: result.success,
        data: result.data,
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

  private async extractDataWithOpenAI(message: string, dataType: string): Promise<any> {
    const prompt = `
    Extrage datele relevante din mesaj pentru ${dataType}.
    
    Mesaj: "${message}"
    
    Returnează un JSON cu datele extrase.
    `;

    try {
      const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
      return JSON.parse(response.content as string);
    } catch (error) {
      console.error('Error extracting data:', error);
      return {};
    }
  }

  private validateStep(stepResult: any, validation: string): boolean {
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

  private updateContext(context: WorkflowContext, stepResult: any): WorkflowContext {
    // Actualizare context cu rezultatele pasului
    return {
      ...context,
      // Adăugare date extrase în context
    };
  }

  private checkSuccessCriteria(results: any[], criteria: string[]): boolean {
    return criteria.every(criterion => 
      results.some(result => 
        result.success && this.matchesCriterion(result, criterion)
      )
    );
  }

  private matchesCriterion(result: any, criterion: string): boolean {
    // Implementare verificare criterii
    return result.action.includes(criterion.replace('_', ''));
  }

  private generateNotification(
    instruction: any,
    results: any[],
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
    results: any[],
    context: WorkflowContext
  ): string {
    // Generare răspuns de succes cu OpenAI
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
      const response = this.openaiModel.invoke([new HumanMessage(prompt)]);
      return (response as any).content || 'Acțiunea a fost realizată cu succes!';
    } catch (error) {
      return 'Acțiunea a fost realizată cu succes!';
    }
  }

  private generateErrorResponse(
    results: any[],
    context: WorkflowContext
  ): string {
    return 'Îmi pare rău, dar am întâmpinat o problemă la procesarea cererii. Vă rog să contactați un coordonator.';
  }

  private async generateResponse(state: AgentState, intent: Intent): Promise<string> {
    const prompt = `
    Generează un răspuns natural și util pentru utilizator bazat pe contextul și intenția.
    
    Mesaj original: ${state.message}
    Business: ${state.businessInfo?.businessName}
    Tip business: ${state.businessInfo?.businessType}
    Intenție: ${intent.action} (${intent.category})
    Încredere: ${intent.confidence}
    
    Răspunsul trebuie să fie:
    - Natural și prietenos
    - Specific pentru tipul de business
    - Să fie în limba română
    - Să nu depășească 200 de cuvinte
    - Să răspundă la intenția utilizatorului
    `;

    try {
      const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
      return response.content as string;
    } catch (error) {
      console.error('Error generating response:', error);
      return 'Îmi pare rău, dar am întâmpinat o problemă la generarea răspunsului. Vă rog să încercați din nou.';
    }
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

  private initializeOpenAI(): void {
    try {
      this.openaiModel = new ChatOpenAI({
        modelName: openaiConfig.modelName,
        maxTokens: openaiConfig.maxTokens,
        temperature: openaiConfig.temperature,
        topP: openaiConfig.topP,
        openAIApiKey: process.env.OPENAI_API_KEY,
      });
      console.log('OpenAI model initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize OpenAI model:', error.message);
      // Pentru producție, creăm un mock model simplu
      this.openaiModel = {
        invoke: async (messages: any[]) => {
          console.warn('Using fallback OpenAI model - no real AI processing');
          return { content: 'Îmi pare rău, serviciul AI nu este disponibil momentan. Vă rog să încercați din nou mai târziu.' };
        }
      } as any;
    }
  }

  

  private generateResponseId(): string {
    // Încearcă să folosească crypto.randomUUID dacă este disponibil
    if (typeof global !== 'undefined' && global.crypto?.randomUUID) {
      return global.crypto.randomUUID();
    }
    
    // Fallback la implementarea existentă
    return `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(data: MessageDto): string {
    // Încearcă să folosească crypto.randomUUID dacă este disponibil
    if (typeof global !== 'undefined' && global.crypto?.randomUUID) {
      return global.crypto.randomUUID();
    }
    
    // Fallback la implementarea existentă
    return `${data.businessId}:${data.userId}:${Date.now()}`;
  }

  private mapHttpMethodToOperationType(method: string): 'create' | 'read' | 'update' | 'delete' {
    switch (method.toLowerCase()) {
      case 'get':
        return 'read';
      case 'post':
        return 'create';
      case 'put':
      case 'patch':
        return 'update';
      case 'delete':
        return 'delete';
      default:
        return 'read';
    }
  }

  private parseDataTemplate(template: string, context: WorkflowContext): any {
    // Înlocuire placeholder-uri cu date reale
    return template
      .replace('{businessId}', context.webhookData.businessId)
      .replace('{locationId}', context.webhookData.locationId)
      .replace('{customerId}', context.webhookData.userId)
      .replace('{date}', new Date().toISOString().split('T')[0])
      .replace('{time}', new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }));
  }

  private generateConfirmationMessage(context: WorkflowContext): string {
    // Generare mesaj de confirmare cu OpenAI
    const prompt = `
      Generează un mesaj de confirmare pentru utilizator.
      
      Context: ${context.businessInfo.businessName} - ${context.businessInfo.businessType}
      Acțiunea: ${context.intent.action}
      
      Mesajul trebuie să fie:
      - Confirmare pozitivă
      - În limba română
      - Specific pentru tipul de business
      - Să includă detalii relevante
    `;

    // Pentru moment, returnăm un mesaj simplu
    return `Confirmare: Acțiunea a fost realizată cu succes!`;
  }
} 