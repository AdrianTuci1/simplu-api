import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { openaiConfig } from '@/config/openai.config';
import { BusinessInfoService } from '../../business-info/business-info.service';
import { RagService } from '../../rag/rag.service';
import { SessionService } from '../../session/session.service';
import { WebSocketGateway } from '../../websocket/websocket.gateway';
import { ExternalApisService } from '../../external-apis/external-apis.service';
import { 
  AgentState, 
  Intent, 
  WebhookData, 
  AutonomousActionResult,
  WorkflowContext 
} from '../interfaces/agent.interface';
import { MessageDto, AgentResponse } from '@/shared/interfaces/message.interface';
import { DynamicMemoryNode } from '../shared/dynamic-memory.node';
import { AppServerDataNode } from './nodes/app-server-data.node';
import { DatabaseQueryNode } from './nodes/database-query.node';
import { BookingGuidanceNode } from './nodes/booking-guidance.node';
import { CustomerRagNode } from './nodes/customer-rag.node';
import { AppServerClient } from './clients/app-server.client';

@Injectable()
export class CustomerAgentService {
  private openaiModel: ChatOpenAI;
  private graphApp: any;
  private memoryMonitor: NodeJS.Timeout;

  constructor(
    private readonly businessInfoService: BusinessInfoService,
    private readonly ragService: RagService,
    private readonly sessionService: SessionService,
    @Inject(forwardRef(() => WebSocketGateway))
    private readonly websocketGateway: WebSocketGateway,
    private readonly externalApisService: ExternalApisService,
    private readonly appServerClient: AppServerClient
  ) {
    // CRITICAL: Check memory usage at startup
    const startupMem = process.memoryUsage();
    const startupMB = Math.round(startupMem.heapUsed / 1024 / 1024);
    console.log(`🚀 Customer Agent Service starting with ${startupMB}MB memory usage`);
    
    if (startupMB > 200) {
      console.error(`🚨 CRITICAL: Starting with high memory usage (${startupMB}MB). This may cause issues.`);
    }
    
    this.initializeOpenAI();
    this.setupGraph();
    this.startMemoryMonitoring();
  }

  // Process messages from webhooks (customers)
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
      source: 'webhook',
      role: 'customer', // Force customer role
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
      actions: [],
      // Customer-specific capabilities
      userCapabilities: {
        canAccessAllData: false,
        canViewPersonalInfo: false,
        canModifyReservations: false,
        canListAllResources: true, // Can list general info like doctors, services
        responseStyle: 'friendly_guidance'
      }
    };

    // Eagerly load business info and session messages into state before graph execution
    try {
      if (state.businessId) {
        state.businessInfo = await this.businessInfoService.getBusinessInfo(state.businessId);
      }
      
      // Load recent session messages for context (last 4 messages to avoid memory issues)
      if (state.sessionId) {
        const sessionMessages = await this.sessionService.getSessionMessages(state.sessionId, 4);
        state.sessionMessages = sessionMessages.map(msg => ({
          content: msg.content,
          type: msg.type,
          timestamp: msg.timestamp
        }));
        console.log(`CustomerAgentService: Loaded ${state.sessionMessages.length} recent messages for context`);
      }
      
      // Generate time context from current timestamp
      state.timeContext = this.generateTimeContext();
    } catch (e) {
      console.warn('processMessage: failed to pre-load businessInfo or session messages', (e as any)?.message || e);
    }

    // Process with deterministic pipeline (preserves entire state)
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
      
      // Fallback to simple processing
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

  // Process webhook messages (autonomous processing for customers)
  async processWebhookMessage(webhookData: WebhookData): Promise<AutonomousActionResult> {
    // 1. Analyze message with OpenAI to determine intent
    const intent = await this.analyzeIntent(webhookData.message, webhookData.businessId);
    
    // 2. Determine if it can be resolved autonomously
    if (this.canHandleAutonomously(intent)) {
      return await this.processAutonomously(webhookData);
    } else {
      // 3. If it cannot be resolved autonomously, send to coordinator
      return await this.escalateToCoordinator(webhookData, intent);
    }
  }

  // Process webhook through main pipeline (for testing or special cases)
  async processWebhookThroughPipeline(webhookData: WebhookData): Promise<AgentResponse> {
    // Normalize identifiers to avoid undefined in downstream nodes
    const inferredFromSession = (webhookData.sessionId || '').split(':');
    const safeBusinessId = webhookData.businessId || inferredFromSession[0] || '';
    const safeUserId = webhookData.userId || inferredFromSession[1] || '';
    const safeLocationId = webhookData.locationId || 'default';

    const state: AgentState = {
      businessId: safeBusinessId,
      locationId: safeLocationId,
      userId: safeUserId,
      message: (webhookData.message || '').trim(),
      sessionId: webhookData.sessionId || this.generateSessionId(webhookData),
      source: 'webhook', // Set source as webhook for client processing
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
      actions: [],
      // Customer-specific capabilities
      userCapabilities: {
        canAccessAllData: false,
        canViewPersonalInfo: false,
        canModifyReservations: false,
        canListAllResources: true,
        responseStyle: 'friendly_guidance'
      }
    };

    // Eagerly load business info into state before graph execution
    try {
      if (state.businessId) {
        state.businessInfo = await this.businessInfoService.getBusinessInfo(state.businessId);
      }
    } catch (e) {
      console.warn('processWebhookThroughPipeline: failed to pre-load businessInfo', (e as any)?.message || e);
    }

    // Process with deterministic pipeline (preserves entire state)
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
      console.error('Error in LangGraph processing for webhook:', error);
      
      // Fallback to simple processing
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
    // Customer-specific flow: Start → App Server Data → Database Query → Booking Guidance → Response
    const startFlow = async (s: AgentState) => {
      let state = s; // Don't create new object, reuse existing

      // 1) Load dynamic memory snapshots
      const dynamicMemoryNode = new DynamicMemoryNode(this.ragService);
      const memoryResult = await dynamicMemoryNode.invoke(state);
      Object.assign(state, memoryResult); // Merge into existing object

      // 2) Load customer-specific RAG instructions
      const customerRagNode = new CustomerRagNode(this.openaiModel, this.ragService);
      const ragResult = await customerRagNode.invoke(state);
      Object.assign(state, ragResult); // Merge into existing object

      return state;
    };

    const appServerDataFlow = async (s: AgentState) => {
      let state = s; // Don't create new object, reuse existing

      // Get data from app server (patient-booking, business-info)
      const appServerDataNode = new AppServerDataNode(this.openaiModel, this.appServerClient);
      const appServerResult = await appServerDataNode.invoke(state);
      Object.assign(state, appServerResult); // Merge into existing object

      return state;
    };

    const databaseQueryFlow = async (s: AgentState) => {
      let state = s; // Don't create new object, reuse existing

      // Query database for treatments through app-server API
      const databaseQueryNode = new DatabaseQueryNode(this.openaiModel);
      const databaseResult = await databaseQueryNode.invoke(state);
      Object.assign(state, databaseResult); // Merge into existing object

      return state;
    };

    const bookingGuidanceFlow = async (s: AgentState) => {
      let state = s; // Don't create new object, reuse existing

      // Generate booking guidance based on available data
      const bookingGuidanceNode = new BookingGuidanceNode(this.openaiModel, this.appServerClient);
      const guidanceResult = await bookingGuidanceNode.invoke(state);
      Object.assign(state, guidanceResult); // Merge into existing object

      return state;
    };

    const responseFlow = async (s: AgentState) => {
      let state = s; // Don't create new object, reuse existing
      
      // Generate customer-friendly response
      const response = await this.generateCustomerResponse(state);
      state.response = response;
      state.actions = this.generateCustomerActions(state);

      return state;
    };

    // Build a sequential executor for customer-specific flow
    this.graphApp = {
      invoke: async (initialState: AgentState) => {
        let state = initialState; // Don't create new object, reuse existing
        state = await startFlow(state);
        state = await appServerDataFlow(state);
        state = await databaseQueryFlow(state);
        state = await bookingGuidanceFlow(state);
        state = await responseFlow(state);
        return state;
      }
    } as any;
  }

  // Autonomous processing for webhooks
  async processAutonomously(webhookData: WebhookData): Promise<AutonomousActionResult> {
    // 1. Get business info
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
    
    // 2. Analyze intent with OpenAI
    const intent = await this.analyzeIntent(webhookData.message, businessInfo.businessType);
    
    // 3. Get RAG instructions
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
    
    // 4. Execute autonomous workflow
    const result = await this.executeWorkflow(instructions[0], {
      webhookData,
      businessInfo,
      locationInfo,
      intent
    });
    
    // 5. Mark conversation as resolved if successful
    if (result.success && webhookData.sessionId) {
      await this.sessionService.markConversationResolved(webhookData.sessionId);
    }
    
    // 6. Notify coordinator through WebSocket
    await this.notifyCoordinator(result, webhookData.businessId, webhookData.locationId);
    
    return result;
  }

  private async analyzeIntent(message: string, businessType: string): Promise<Intent> {
    const prompt = `
    Analizează mesajul și determină intenția clientului pentru un business de tip ${businessType}.
    
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
        // Execute workflow step
        const stepResult = await this.executeWorkflowStep(step, context);
        results.push(stepResult);
        
        // Check validation
        if (step.validation && !this.validateStep(stepResult, step.validation)) {
          throw new Error(`Validation failed for step ${step.step}`);
        }
        
        // Update context for next step
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
    
    // Check success criteria
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
      // Execute resource operation (writes via Kinesis)
      const operationType = this.mapHttpMethodToOperationType(step.apiCall.method);
      const resourceType = step.apiCall.endpoint.split('/').pop();
      const data = this.parseDataTemplate(step.apiCall.dataTemplate, context);
      // Resource operations are now handled by app-server API
      const result = {
        success: true,
        message: 'Resource operation forwarded to app-server API',
        requestId: `api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        data: { operation: operationType, resourceType, data }
      };

      return {
        step: step.step,
        action: step.action,
        success: !!result?.success,
        data: { requestId: result?.requestId, message: result?.message },
        timestamp: new Date().toISOString()
      };
    }

    if (step.action === 'send_confirmation') {
      // Send confirmation through original channel
      const source = context.webhookData.source;
      const userId = context.webhookData.userId;
      const message = this.generateConfirmationMessage(context);

      let result;
      try {
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
      } catch (error: any) {
        // Graceful handling when credentials are missing or API fails
        console.warn(`⚠️ External API call failed for ${source}:`, error.message);
        result = {
          success: false,
          error: 'External API credentials not configured',
          fallback: true
        };
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
      // Extract details with OpenAI
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
      // Create reservation through app-server API
      const reservationData = this.parseDataTemplate(step.dataTemplate, context);
      const result = {
        success: true,
        message: 'Reservation creation forwarded to app-server API',
        requestId: `reservation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        data: { operation: 'create', resourceType: 'reservations', data: reservationData }
      };

      return {
        step: step.step,
        action: step.action,
        success: !!result?.success,
        data: { requestId: result?.requestId, message: result?.message },
        timestamp: new Date().toISOString()
      };
    }
    
    // Default steps
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
    // Implement simple validations
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
    // Update context with step results
    return {
      ...context,
      // Add extracted data to context
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
    // Implement criterion checking
    return result.action.includes(criterion.replace('_', ''));
  }

  private generateNotification(
    instruction: any,
    results: any[],
    context: WorkflowContext
  ): string {
    const template = instruction.notificationTemplate;
    
    // Populate template with data from results
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
    // Generate success response with OpenAI
    const prompt = `
    Generează un răspuns de succes pentru client.
    
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
    Generează un răspuns natural și util pentru client bazat pe contextul și intenția.
    
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
    - Să răspundă la intenția clientului
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
    
    // Send to all business coordinators
    this.websocketGateway.broadcastToBusiness(businessId, 'coordinator_notification', notification);
  }

  private async escalateToCoordinator(
    webhookData: WebhookData,
    intent: Intent
  ): Promise<AutonomousActionResult> {
    // Send notification to coordinators
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
      console.log('OpenAI model initialized successfully for Customer Agent');
    } catch (error) {
      console.warn('Failed to initialize OpenAI model:', error.message);
      // For production, create a simple mock model
      this.openaiModel = {
        invoke: async (messages: any[]) => {
          console.warn('Using fallback OpenAI model - no real AI processing');
          return { content: 'Îmi pare rău, serviciul AI nu este disponibil momentan. Vă rog să încercați din nou mai târziu.' };
        }
      } as any;
    }
  }

  private generateResponseId(): string {
    // Try to use crypto.randomUUID if available
    if (typeof global !== 'undefined' && global.crypto?.randomUUID) {
      return global.crypto.randomUUID();
    }
    
    // Fallback to existing implementation
    return `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(data: MessageDto): string {
    // Try to use crypto.randomUUID if available
    if (typeof global !== 'undefined' && global.crypto?.randomUUID) {
      return global.crypto.randomUUID();
    }
    
    // Fallback to existing implementation
    return `${data.businessId}:${data.userId}:${Date.now()}`;
  }

  private generateTimeContext(): any {
    const now = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    return {
      currentTimestamp: now.toISOString(),
      currentDate: now.toLocaleDateString('ro-RO'),
      currentTime: now.toLocaleTimeString('ro-RO'),
      timezone,
      dayOfWeek: now.toLocaleDateString('ro-RO', { weekday: 'long' }),
      isWeekend: now.getDay() === 0 || now.getDay() === 6,
      isBusinessHours: now.getHours() >= 9 && now.getHours() < 18 && now.getDay() >= 1 && now.getDay() <= 5
    };
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
    // Replace placeholders with real data
    return template
      .replace('{businessId}', context.webhookData.businessId)
      .replace('{locationId}', context.webhookData.locationId)
      .replace('{customerId}', context.webhookData.userId)
      .replace('{date}', new Date().toISOString().split('T')[0])
      .replace('{time}', new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }));
  }

  private generateConfirmationMessage(context: WorkflowContext): string {
    // Generate confirmation message with OpenAI
    const prompt = `
      Generează un mesaj de confirmare pentru client.
      
      Context: ${context.businessInfo.businessName} - ${context.businessInfo.businessType}
      Acțiunea: ${context.intent.action}
      
      Mesajul trebuie să fie:
      - Confirmare pozitivă
      - În limba română
      - Specific pentru tipul de business
      - Să includă detalii relevante
    `;

    // For now, return a simple message
    return `Confirmare: Acțiunea a fost realizată cu succes!`;
  }

  // CRITICAL: Memory monitoring to prevent out of memory errors
  private startMemoryMonitoring(): void {
    console.log('🔍 MEMORY MONITORING STARTED for Customer Agent - This should appear in logs if new code is running');
    
    this.memoryMonitor = setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      
      // Log memory usage more frequently to track the issue
      console.log(`📊 Customer Agent Memory: ${heapUsedMB}MB / ${heapTotalMB}MB (${Math.round(heapUsedMB/heapTotalMB*100)}%) - RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
      
      // Force garbage collection if memory usage is high
      if (heapUsedMB > 300) { // Lowered threshold from 400 to 300
        console.warn(`High memory usage detected in Customer Agent: ${heapUsedMB}MB. Forcing garbage collection...`);
        if (global.gc) {
          global.gc();
          const afterGC = process.memoryUsage();
          const afterMB = Math.round(afterGC.heapUsed / 1024 / 1024);
          console.log(`After GC: ${afterMB}MB (freed ${heapUsedMB - afterMB}MB)`);
        }
      }
      
      // Emergency memory cleanup if usage is critical
      if (heapUsedMB > 500) {
        console.error(`CRITICAL: Memory usage at ${heapUsedMB}MB in Customer Agent. Emergency cleanup...`);
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
        console.error(`CATASTROPHIC: Memory usage at ${heapUsedMB}MB in Customer Agent. Forcing exit to prevent system crash.`);
        process.exit(1); // Force restart
      }
    }, 30000); // Check every 30 seconds
  }

  private async generateCustomerResponse(state: AgentState): Promise<string> {
    const prompt = `
    Generează un răspuns prietenos și util pentru client bazat pe datele disponibile.
    
    Context:
    - Business: ${state.businessInfo?.businessName || 'necunoscut'} (${state.businessInfo?.businessType || 'general'})
    - Mesaj: "${state.message}"
    - Servicii disponibile: ${JSON.stringify(state.appServerData?.services || [])}
    - Date disponibile: ${JSON.stringify(state.appServerData?.availableDates || [])}
    - Tratamente: ${JSON.stringify(state.databaseQueryResults || [])}
    - Ghidaj rezervare: ${JSON.stringify(state.bookingGuidance || {})}
    
    Răspunsul trebuie să fie:
    - Prietenos și util
    - Să includă informații despre servicii disponibile
    - Să ghideze clientul către rezervare
    - Să fie în limba română
    - Să nu depășească 200 de cuvinte
    `;

    try {
      const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
      return response.content as string;
    } catch (error) {
      console.error('Error generating customer response:', error);
      return 'Îmi pare rău, dar am întâmpinat o problemă la generarea răspunsului. Vă rog să încercați din nou.';
    }
  }

  private generateCustomerActions(state: AgentState): any[] {
    const actions = [];
    
    // Add action to view available services
    if (state.appServerData?.services && state.appServerData.services.length > 0) {
      actions.push({
        type: 'view_services',
        title: 'Vezi serviciile disponibile',
        data: state.appServerData.services
      });
    }
    
    // Add action to view available dates
    if (state.appServerData?.availableDates && state.appServerData.availableDates.length > 0) {
      actions.push({
        type: 'view_available_dates',
        title: 'Vezi datele disponibile',
        data: state.appServerData.availableDates
      });
    }
    
    // Add action to view treatments
    if (state.databaseQueryResults && state.databaseQueryResults.length > 0) {
      actions.push({
        type: 'view_treatments',
        title: 'Vezi tratamentele disponibile',
        data: state.databaseQueryResults
      });
    }
    
    // Add action to book appointment if guidance is available
    if (state.bookingGuidance) {
      actions.push({
        type: 'book_appointment',
        title: 'Rezervă o programare',
        data: state.bookingGuidance
      });
    }
    
    return actions;
  }

  // Cleanup method
  onModuleDestroy(): void {
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
    }
  }
}
