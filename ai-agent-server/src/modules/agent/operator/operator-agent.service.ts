import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { openaiConfig } from '@/config/openai.config';
import { BusinessInfoService } from '../../business-info/business-info.service';
import { RagService } from '../../rag/rag.service';
import { InitialInstructionsService } from '../../rag/data/initial-instructions';
import { SessionService } from '../../session/session.service';
import { WebSocketGateway } from '../../websocket/websocket.gateway';
import { ElixirHttpService } from '../../websocket/elixir-http.service';
import { 
  AgentState, 
  Intent
} from '../interfaces/agent.interface';
import { MessageDto, AgentResponse } from '@/shared/interfaces/message.interface';
import { DynamicMemoryNode } from '../shared/dynamic-memory.node';
import { FrontendQueryNode } from './nodes/frontend-query.node';
import { DraftCreationNode } from './nodes/draft-creation.node';
import { OperatorResponseNode } from './nodes/operator-response.node';
import { OperatorRagNode } from './nodes/operator-rag.node';
import { AgentWebSocketHandler } from './handlers/agent-websocket.handler';
import { AgentQueryModifier } from './handlers/agent-query-modifier';

@Injectable()
export class OperatorAgentService {
  private openaiModel: ChatOpenAI;
  private graphApp: any;
  private memoryMonitor: NodeJS.Timeout;

  constructor(
    private readonly businessInfoService: BusinessInfoService,
    private readonly ragService: RagService,
    private readonly initialInstructionsService: InitialInstructionsService,
    private readonly sessionService: SessionService,
    private readonly agentWebSocketHandler: AgentWebSocketHandler,
    private readonly agentQueryModifier: AgentQueryModifier,
    private readonly elixirHttpService: ElixirHttpService
  ) {
    // CRITICAL: Check memory usage at startup
    const startupMem = process.memoryUsage();
    const startupMB = Math.round(startupMem.heapUsed / 1024 / 1024);
    console.log(`🚀 Operator Agent Service starting with ${startupMB}MB memory usage`);
    
    if (startupMB > 200) {
      console.error(`🚨 CRITICAL: Starting with high memory usage (${startupMB}MB). This may cause issues.`);
    }
    
    this.initializeOpenAI();
    this.setupGraph();
    this.startMemoryMonitoring();
  }

  // Process messages from WebSocket (operators)
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
      role: 'operator', // Force operator role
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
      // Operator-specific capabilities
      userCapabilities: {
        canAccessAllData: true,
        canViewPersonalInfo: true,
        canModifyReservations: true,
        canListAllResources: true,
        responseStyle: 'concise'
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
        console.log(`OperatorAgentService: Loaded ${state.sessionMessages.length} recent messages for context`);
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
        sessionId: state.sessionId,
        draft: state.draft // Include draft if available
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
        sessionId: state.sessionId,
        draft: undefined // No draft in fallback mode
      };
    }
  }

  private setupGraph(): void {
    // Operator-specific flow: Start → Frontend Query → Draft Creation → Response
    const startFlow = async (s: AgentState) => {
      let state = s; // Don't create new object, reuse existing

      // 1) Load dynamic memory snapshots
      const dynamicMemoryNode = new DynamicMemoryNode(this.ragService);
      const memoryResult = await dynamicMemoryNode.invoke(state);
      Object.assign(state, memoryResult); // Merge into existing object

      // 2) Load operator-specific RAG instructions
      const operatorRagNode = new OperatorRagNode(this.openaiModel, this.ragService, this.initialInstructionsService);
      const ragResult = await operatorRagNode.invoke(state);
      Object.assign(state, ragResult); // Merge into existing object

      return state;
    };

    const frontendQueryFlow = async (s: AgentState) => {
      let state = s; // Don't create new object, reuse existing

      // Generate frontend queries to interrogate the application
      const frontendQueryNode = new FrontendQueryNode(this.openaiModel, this.ragService);
      const frontendResult = await frontendQueryNode.invoke(state);
      Object.assign(state, frontendResult); // Merge into existing object

      // If we need frontend interaction, send queries to frontend via WebSocket
      // but DON'T wait for results here - they will come back separately
      if (state.needsFrontendInteraction && state.frontendQueries) {
        // Send queries to frontend and mark that we're waiting for results
        await this.sendFrontendQueries(state.frontendQueries, state.businessId, state.sessionId, state.locationId);
        state.waitingForFrontendResults = true;
        state.frontendQueryResults = []; // Will be populated when results come back
      }

      return state;
    };

    const draftCreationFlow = async (s: AgentState) => {
      let state = s; // Don't create new object, reuse existing

      // Only create drafts if we have frontend results or if no frontend interaction was needed
      if (!state.waitingForFrontendResults && (state.frontendQueryResults?.length > 0 || !state.needsFrontendInteraction)) {
        const draftCreationNode = new DraftCreationNode(this.openaiModel);
        const draftResult = await draftCreationNode.invoke(state);
        Object.assign(state, draftResult); // Merge into existing object
      }

      return state;
    };

    const responseFlow = async (s: AgentState) => {
      let state = s; // Don't create new object, reuse existing
      
      // Generate operator-specific response
      const operatorResponseNode = new OperatorResponseNode(this.openaiModel);
      const responseResult = await operatorResponseNode.invoke(state);
      Object.assign(state, responseResult); // Merge into existing object

      return state;
    };

    // Build a sequential executor for operator-specific flow
    this.graphApp = {
      invoke: async (initialState: AgentState) => {
        let state = initialState; // Don't create new object, reuse existing
        
        // 1. Start flow (includes RAG and memory)
        state = await startFlow(state);
        
        // 2. Check if we need specific help or just general greeting
        if (this.isGeneralGreeting(state.message)) {
          // General greeting - no specific queries needed
          const greetingResult = await this.handleGeneralGreeting(state);
          Object.assign(state, greetingResult);
        } else {
          // Specific request - proceed with frontend queries
          state = await frontendQueryFlow(state);
          state = await draftCreationFlow(state);
        }
        
        // 3. Generate response
        state = await responseFlow(state);
        return state;
      }
    } as any;
  }

  private isGeneralGreeting(message: string): boolean {
    const greetingKeywords = [
      'salut', 'bună', 'hello', 'hi', 'hei',
      'cu ce ma poti ajuta', 'cu ce poti ajuta', 'ce poti face',
      'ajutor', 'help', 'ce faci', 'cum esti'
    ];
    
    const lowerMessage = message.toLowerCase().trim();
    return greetingKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private async handleGeneralGreeting(state: AgentState): Promise<Partial<AgentState>> {
    // Try to get user info from medics if available
    let userInfo = null;
    try {
      // This would be a call to get user info from medics
      // For now, we'll skip this to avoid failures
      // userInfo = await this.getUserInfoFromMedics(state.userId);
    } catch (error) {
      console.log('Could not get user info from medics, continuing with general greeting');
    }

    const businessName = state.businessInfo?.businessName || 'business-ul nostru';
    
    // Generate personalized greeting based on context
    let greeting;
    if (userInfo) {
      greeting = `Salut ${userInfo.name}! Sunt asistentul tău virtual al ${businessName}. Cu ce te pot ajuta astăzi?`;
    } else {
      // More personal and helpful greeting as requested
      greeting = `Salut! Sunt asistentul tău virtual al ${businessName}. Cu ce te pot ajuta astăzi? Pot creea schițe sau obține date pentru tine - doar spune-mi ce dorești să fac.`;
    }

    return {
      response: greeting,
      needsFrontendInteraction: false,
      frontendQueries: [],
      actions: [
        {
          type: 'greeting',
          status: 'success' as const,
          details: {
            message: 'Salutare personalizată',
            businessName: businessName,
            capabilities: ['creea schițe', 'obține date', 'gestionare interfață']
          }
        }
      ]
    };
  }

  private async analyzeIntent(message: string, businessType: string): Promise<Intent> {
    const prompt = `
    Analizează mesajul și determină intenția operatorului pentru un business de tip ${businessType}.
    
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

  private async generateResponse(state: AgentState, intent: Intent): Promise<string> {
    const prompt = `
    Generează un răspuns concis și profesional pentru operator bazat pe contextul și intenția.
    
    Mesaj original: ${state.message}
    Business: ${state.businessInfo?.businessName}
    Tip business: ${state.businessInfo?.businessType}
    Intenție: ${intent.action} (${intent.category})
    Încredere: ${intent.confidence}
    
    Răspunsul trebuie să fie:
    - Concis și profesional
    - Specific pentru operatori
    - Să fie în limba română
    - Să nu depășească 150 de cuvinte
    - Să răspundă la intenția operatorului
    `;

    try {
      const response = await this.openaiModel.invoke([new HumanMessage(prompt)]);
      return response.content as string;
    } catch (error) {
      console.error('Error generating response:', error);
      return 'Îmi pare rău, dar am întâmpinat o problemă la generarea răspunsului. Vă rog să încercați din nou.';
    }
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
      console.log('OpenAI model initialized successfully for Operator Agent');
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

  // CRITICAL: Memory monitoring to prevent out of memory errors
  private startMemoryMonitoring(): void {
    console.log('🔍 MEMORY MONITORING STARTED for Operator Agent - This should appear in logs if new code is running');
    
    this.memoryMonitor = setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      
      // Log memory usage more frequently to track the issue
      console.log(`📊 Operator Agent Memory: ${heapUsedMB}MB / ${heapTotalMB}MB (${Math.round(heapUsedMB/heapTotalMB*100)}%) - RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
      
      // Force garbage collection if memory usage is high
      if (heapUsedMB > 300) { // Lowered threshold from 400 to 300
        console.warn(`High memory usage detected in Operator Agent: ${heapUsedMB}MB. Forcing garbage collection...`);
        if (global.gc) {
          global.gc();
          const afterGC = process.memoryUsage();
          const afterMB = Math.round(afterGC.heapUsed / 1024 / 1024);
          console.log(`After GC: ${afterMB}MB (freed ${heapUsedMB - afterMB}MB)`);
        }
      }
      
      // Emergency memory cleanup if usage is critical
      if (heapUsedMB > 500) {
        console.error(`CRITICAL: Memory usage at ${heapUsedMB}MB in Operator Agent. Emergency cleanup...`);
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
        console.error(`CATASTROPHIC: Memory usage at ${heapUsedMB}MB in Operator Agent. Forcing exit to prevent system crash.`);
        process.exit(1); // Force restart
      }
    }, 30000); // Check every 30 seconds
  }

  // Send frontend queries via Elixir HTTP (non-blocking)
  private async sendFrontendQueries(frontendQueries: any[], businessId: string, sessionId: string, locationId: string = 'default'): Promise<void> {
    console.log('Sending frontend queries via Elixir HTTP:', frontendQueries);
    
    try {
      // Send all queries to Elixir via HTTP
      await this.elixirHttpService.sendFrontendQueries(
        businessId,
        sessionId.split(':')[1] || 'unknown', // Extract userId from sessionId
        sessionId,
        frontendQueries,
        locationId
      );
      
      console.log(`Frontend queries sent to Elixir for session ${sessionId}`);
    } catch (error) {
      console.error(`Error sending frontend queries to Elixir:`, error);
    }
  }

  // Handle frontend query results when they come back
  async handleFrontendQueryResults(sessionId: string, results: any[]): Promise<void> {
    console.log(`Received frontend query results for session ${sessionId}:`, results);
    
    // Store results for this session - they will be used when processing the next message
    // or when the operator explicitly requests to process the results
    // This could be stored in a session cache or database
    // For now, we'll log them and they can be processed in the next message
  }

  // Cleanup method
  onModuleDestroy(): void {
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
    }
  }
}
