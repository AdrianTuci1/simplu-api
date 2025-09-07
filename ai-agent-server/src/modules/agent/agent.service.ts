import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
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
import { RagSearchNode } from './langchain/nodes/external/rag-search.node';
import { ResourceOperationsNode } from './langchain/nodes/external/resource-operations.node';
import { ExternalApiNode } from './langchain/nodes/external/external-api.node';
import { ResponseNode } from './langchain/nodes/final/response.node';
import { InternalLoopNode } from './langchain/nodes/final/internal-loop.node';
import { LoopNode } from './langchain/nodes/final/loop.node';
import { IdentificationNode } from './langchain/nodes/start/identification.node';
import { DynamicMemoryNode } from './langchain/nodes/start/dynamic-memory.node';
import { ResourcesIntrospectionNode } from './langchain/nodes/internal/introspection.node';
import { RagUpdateNode } from './langchain/nodes/internal/rag-update.node';
import { ReasoningNode } from './langchain/nodes/start/reasoning.node';
import { SystemRagNode } from './langchain/nodes/start/system-rag.node';
import { SqlGenerateNode } from './langchain/nodes/internal/sql-generate.node';
import { SqlExecuteNode } from './langchain/nodes/internal/sql-execute.node';
import { ResourceQueryService } from '../resources/services/resource-query.service';

@Injectable()
export class AgentService {
  private openaiModel: ChatOpenAI;
  private graphApp: any;
  private memoryMonitor: NodeJS.Timeout;

  constructor(
    private readonly businessInfoService: BusinessInfoService,
    private readonly ragService: RagService,
    private readonly sessionService: SessionService,
    @Inject(forwardRef(() => WebSocketGateway))
    private readonly websocketGateway: WebSocketGateway,
    private readonly resourcesService: ResourcesService,
    private readonly resourceQueryService: ResourceQueryService,
    private readonly externalApisService: ExternalApisService
  ) {
    // CRITICAL: Check memory usage at startup
    const startupMem = process.memoryUsage();
    const startupMB = Math.round(startupMem.heapUsed / 1024 / 1024);
    console.log(`🚀 Agent Service starting with ${startupMB}MB memory usage`);
    
    if (startupMB > 200) {
      console.error(`🚨 CRITICAL: Starting with high memory usage (${startupMB}MB). This may cause issues.`);
    }
    
    this.initializeOpenAI();
    this.setupGraph();
    this.startMemoryMonitoring();
  }

  // Procesare mesaje de la WebSocket (coordonatori)
  async processMessage(data: MessageDto): Promise<AgentResponse> {
    // Normalize identifiers to avoid undefined in downstream nodes
    const inferredFromSession = (data.sessionId || '').split(':');
    const safeBusinessId = data.businessId || inferredFromSession[0] || '';
    const safeUserId = data.userId || inferredFromSession[1] || '';
    const safeLocationId = data.locationId || 'default';

    const state: AgentState = {
      businessId: safeBusinessId,
      locationId: safeLocationId,
      userId: safeUserId,
      message: (data.message || '').trim(),
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

    // Eagerly load business info into state before graph execution
    try {
      if (state.businessId) {
        state.businessInfo = await this.businessInfoService.getBusinessInfo(state.businessId);
      }
    } catch (e) {
      console.warn('processMessage: failed to pre-load businessInfo', (e as any)?.message || e);
    }

    // Procesare cu pipeline determinist (păstrează întregul state)
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
    // Start → choose internal/external → End
    // Wrap existing nodes into grouped flow functions for clarity
    const startFlow = async (s: AgentState) => {
      let state = s; // Don't create new object, reuse existing

      // 2) Identify role/client status using discovered resources and source
      const identificationNode = new IdentificationNode(this.ragService);
      const identificationResult = await identificationNode.invoke(state);
      Object.assign(state, identificationResult); // Merge into existing object

      // 3) Load dynamic memory snapshots
      const dynamicMemoryNode = new DynamicMemoryNode(this.ragService);
      const memoryResult = await dynamicMemoryNode.invoke(state);
      Object.assign(state, memoryResult); // Merge into existing object

      // 4) Load system instructions (with base strategy instruction)
      const systemRagNode = new SystemRagNode(this.ragService);
      const systemResult = await systemRagNode.invoke(state);
      Object.assign(state, systemResult); // Merge into existing object

      // 5) Try RAG search early for direct instructions
      try {
        const ragSearchNode = new RagSearchNode(this.openaiModel, this.ragService, this.resourcesService);
        const ragOut = await ragSearchNode.invoke(state);
        Object.assign(state, ragOut); // Merge into existing object
      } catch (e) {
        console.warn('startFlow: rag search failed gracefully', (e as any)?.message || e);
      }

      // 6) Discover capabilities/resources upfront so downstream nodes know what's possible
      try {
        const introspectionNode = new ResourcesIntrospectionNode(this.openaiModel, this.resourcesService);
        const discovery = await introspectionNode.invoke(state);
        Object.assign(state, discovery); // Merge into existing object
        // If introspection indicates RAG update is needed, perform it immediately
        if (state.needsRagUpdate) {
          const ragUpdateNode = new RagUpdateNode(this.ragService);
          const updateResult = await ragUpdateNode.invoke(state);
          Object.assign(state, updateResult); // Merge into existing object
        }
      } catch (e) {
        console.warn('startFlow: skipping introspection due to error', (e as any)?.message || e);
      }

      // 7) Decide next actions
      const reasoningNode = new ReasoningNode(this.openaiModel, this.ragService);
      const reasoningResult = await reasoningNode.invoke(state);
      Object.assign(state, reasoningResult); // Merge into existing object

      return state;
    };

    const internalFlow = async (s: AgentState) => {
      let state = s; // Don't create new object, reuse existing

      if (!state.discoveredResourceTypes || !state.discoveredSchemas) {
        const introspectionNode = new ResourcesIntrospectionNode(this.openaiModel, this.resourcesService);
        const introspectionResult = await introspectionNode.invoke(state);
        Object.assign(state, introspectionResult); // Merge into existing object
      }

      // Optional: generate and execute SQL-like intent for internal reporting/use-cases
      const sqlGenerateNode = new SqlGenerateNode(this.openaiModel);
      const sqlGenerateResult = await sqlGenerateNode.invoke(state);
      Object.assign(state, sqlGenerateResult); // Merge into existing object

      const sqlExecuteNode = new SqlExecuteNode(this.resourcesService, this.resourceQueryService);
      const sqlExecuteResult = await sqlExecuteNode.invoke(state);
      Object.assign(state, sqlExecuteResult); // Merge into existing object

      if (state.needsRagUpdate) {
        const ragUpdateNode = new RagUpdateNode(this.ragService);
        const ragUpdateResult = await ragUpdateNode.invoke(state);
        Object.assign(state, ragUpdateResult); // Merge into existing object
      }

      return state;
    };

    const externalFlow = async (s: AgentState) => {
      let state = s; // Don't create new object, reuse existing

      // External: understanding -> rag check -> router -> finalize
      const ragSearchNode = new RagSearchNode(this.openaiModel, this.ragService, this.resourcesService);
      const ragResult = await ragSearchNode.invoke(state);
      Object.assign(state, ragResult); // Merge into existing object

      if (state.needsResourceSearch) {
        const resourceOpsNode = new ResourceOperationsNode(this.openaiModel);
        const resourceResult = await resourceOpsNode.invoke(state);
        Object.assign(state, resourceResult); // Merge into existing object
      }

      if (state.needsExternalApi) {
        const externalApiNode = new ExternalApiNode(this.openaiModel);
        const apiResult = await externalApiNode.invoke(state);
        Object.assign(state, apiResult); // Merge into existing object
      }

      return state;
    };

    const endNode = async (s: AgentState) => {
      let state = s; // Don't create new object, reuse existing
      const responseNode = new ResponseNode(this.openaiModel);
      const responseResult = await responseNode.invoke(state);
      Object.assign(state, responseResult); // Merge into existing object

      // Internal loop: update RAG with final response context
      const internalLoopNode = new InternalLoopNode(this.ragService);
      const loopResult = await internalLoopNode.invoke(state);
      Object.assign(state, loopResult); // Merge into existing object

      // Loop: signal return to listening
      const loopNode = new LoopNode();
      const finalResult = await loopNode.invoke(state);
      Object.assign(state, finalResult); // Merge into existing object

      return state;
    };

    // Construiește un executor secvențial care păstrează întregul state fără canale LangGraph
    this.graphApp = {
      invoke: async (initialState: AgentState) => {
        let state = initialState; // Don't create new object, reuse existing
        state = await startFlow(state);
        console.log(`[AgentService] After startFlow - startRoute: ${state.startRoute}, source: ${state.source}`);
        if (state.startRoute === 'internal') {
          console.log(`[AgentService] Executing INTERNAL flow`);
          state = await internalFlow(state);
        } else {
          console.log(`[AgentService] Executing EXTERNAL flow`);
          state = await externalFlow(state);
        }
        state = await endNode(state);
        return state;
      }
    } as any;
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
      // Executare operație pe resurse (writes via Kinesis)
      const operationType = this.mapHttpMethodToOperationType(step.apiCall.method);
      const resourceType = step.apiCall.endpoint.split('/').pop();
      const data = this.parseDataTemplate(step.apiCall.dataTemplate, context);
      const result = await this.resourcesService.processResourceOperation({
        operation: operationType as any,
        businessId: context.webhookData.businessId,
        locationId: context.webhookData.locationId,
        resourceType: resourceType as any,
        data,
      } as any);

      return {
        step: step.step,
        action: step.action,
        success: !!result?.success,
        data: { requestId: result?.requestId, message: result?.message },
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
      // Creare rezervare prin ResourcesService (enqueue via Kinesis)
      const reservationData = this.parseDataTemplate(step.dataTemplate, context);
      const result = await this.resourcesService.processResourceOperation({
        operation: 'create' as any,
        businessId: context.webhookData.businessId,
        locationId: context.webhookData.locationId,
        resourceType: 'reservations' as any,
        data: reservationData,
      } as any);

      return {
        step: step.step,
        action: step.action,
        success: !!result?.success,
        data: { requestId: result?.requestId, message: result?.message },
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

  // CRITICAL: Memory monitoring to prevent out of memory errors
  private startMemoryMonitoring(): void {
    console.log('🔍 MEMORY MONITORING STARTED - This should appear in logs if new code is running');
    
    this.memoryMonitor = setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      
      // Log memory usage more frequently to track the issue
      console.log(`📊 Memory: ${heapUsedMB}MB / ${heapTotalMB}MB (${Math.round(heapUsedMB/heapTotalMB*100)}%) - RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
      
      // Force garbage collection if memory usage is high
      if (heapUsedMB > 300) { // Lowered threshold from 400 to 300
        console.warn(`High memory usage detected: ${heapUsedMB}MB. Forcing garbage collection...`);
        if (global.gc) {
          global.gc();
          const afterGC = process.memoryUsage();
          const afterMB = Math.round(afterGC.heapUsed / 1024 / 1024);
          console.log(`After GC: ${afterMB}MB (freed ${heapUsedMB - afterMB}MB)`);
        }
      }
      
      // Emergency memory cleanup if usage is critical
      if (heapUsedMB > 500) {
        console.error(`CRITICAL: Memory usage at ${heapUsedMB}MB. Emergency cleanup...`);
        // Clear any cached data
        if (global.gc) {
          global.gc();
          global.gc(); // Force multiple GC cycles
        }
        // Log memory after emergency cleanup
        const emergencyGC = process.memoryUsage();
        const emergencyMB = Math.round(emergencyGC.heapUsed / 1024 / 1024);
        console.log(`Emergency cleanup complete: ${emergencyMB}MB`);
      }
      
      // EMERGENCY: Force exit if memory usage is catastrophic
      if (heapUsedMB > 800) {
        console.error(`CATASTROPHIC: Memory usage at ${heapUsedMB}MB. Forcing exit to prevent system crash.`);
        process.exit(1); // Force restart
      }
    }, 30000); // Check every 30 seconds
  }

  // Cleanup method
  onModuleDestroy(): void {
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
    }
  }
} 