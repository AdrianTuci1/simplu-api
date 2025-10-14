import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { 
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
  RetrieveCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { BedrockInvocationResult, ToolContext } from '../interfaces';
import { ToolExecutorService } from './tool-executor.service';
import { ElixirNotificationTool } from '../http-tools/elixir-notification.tool';

export interface BedrockConfig {
  agentId: string;
  agentAliasId: string;
  knowledgeBaseId?: string;
  region: string;
  modelId?: string;
}

@Injectable()
export class BedrockAgentService {
  private readonly logger = new Logger(BedrockAgentService.name);
  private bedrockClient: BedrockAgentRuntimeClient;
  private config: BedrockConfig;

  constructor(
    @Inject(forwardRef(() => ToolExecutorService))
    private readonly toolExecutorService: ToolExecutorService,
    @Inject(forwardRef(() => ElixirNotificationTool))
    private readonly elixirNotificationTool: ElixirNotificationTool,
  ) {
    this.config = {
      agentId: process.env.BEDROCK_AGENT_ID || '',
      agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID || 'TSTALIASID',
      knowledgeBaseId: process.env.BEDROCK_KNOWLEDGE_BASE_ID || '',
      region: process.env.AWS_BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1',
    };

    this.bedrockClient = new BedrockAgentRuntimeClient({
      region: this.config.region,
    });

    this.logger.log(`🤖 Bedrock Agent Service initialized with agent: ${this.config.agentId}`);
  }

  /**
   * Invocă Bedrock Agent cu un mesaj
   * @param previousSessionState - State-ul returnat de Bedrock în apelul anterior (pentru conversații multi-turn)
   */
  async invokeAgent(
    message: string,
    context: ToolContext,
    sessionId?: string,
    previousSessionState?: any,
  ): Promise<BedrockInvocationResult> {
    const startTime = Date.now();

    try {
      this.logger.log(`📤 Invoking Bedrock Agent for session: ${sessionId || context.sessionId}`);

      // Prepare session attributes (static context)
      const sessionAttributes = {
        businessId: context.businessId,
        locationId: context.locationId,
        userId: context.userId,
        role: context.role,
        businessType: context.businessType || 'dental',
        source: context.source,
      };
      
      // Prepare prompt session attributes (dynamic context available to agent)
      // These are automatically available to the agent and tools!
      const now = new Date();
      const promptSessionAttributes = {
        businessId: context.businessId,
        locationId: context.locationId,
        userId: context.userId,
        role: context.role,
        businessType: context.businessType || 'dental',
        currentDate: now.toISOString().split('T')[0], // YYYY-MM-DD
        currentTime: now.toTimeString().split(' ')[0], // HH:MM:SS
        currentDateTime: now.toISOString(),
      };

      // If we have previous state, merge it with current attributes
      const sessionState = previousSessionState ? {
        ...previousSessionState,
        sessionAttributes: {
          ...previousSessionState.sessionAttributes,
          ...sessionAttributes,
        },
        promptSessionAttributes: {
          ...previousSessionState.promptSessionAttributes,
          ...promptSessionAttributes, // Update with fresh values
        },
      } : {
        sessionAttributes,
        promptSessionAttributes,
      };

      if (previousSessionState) {
        this.logger.log(`🔄 Reusing previous session state with ${Object.keys(previousSessionState.promptSessionAttributes || {}).length} prompt attributes`);
      }
      
      this.logger.log(`📋 Prompt session attributes: ${JSON.stringify(promptSessionAttributes, null, 2)}`);

      // ALWAYS prepend context to EVERY message
      // This ensures agent has fresh context (especially currentTime) for every request

      const currentDateTime = now.toISOString();
      const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
      
      const contextPrefix = `[System Context - Use these exact values in tool calls:
- businessId: ${context.businessId}
- locationId: ${context.locationId}
- userId: ${context.userId}
- role: ${context.role}
- businessType: ${context.businessType}
- currentDate: ${currentDate}
- currentTime: ${currentTime}
- timestamp: ${currentDateTime}]

`;
      
      const inputText = contextPrefix + message;
      this.logger.log(`📋 Adding context prefix (current time: ${currentDateTime})`);
      
      if (previousSessionState) {
        this.logger.log(`🔄 Continuing conversation with context refresh`);
      }

      const command = new InvokeAgentCommand({
        agentId: this.config.agentId,
        agentAliasId: this.config.agentAliasId,
        sessionId: sessionId || context.sessionId,
        inputText,
        sessionState,
        enableTrace: true, // Pentru debugging
      });

      const response = await this.bedrockClient.send(command);

      this.logger.log(`📡 Bedrock response received, processing stream...`);

      // Process streaming response (isPrimaryInvocation = true pentru apelul principal)
      const completion = await this.processBedrockStream(
        response,
        context,
        sessionId || context.sessionId,
        { streamChunks: true, sendCompletion: true }
      );

      const executionTime = Date.now() - startTime;
      this.logger.log(`✅ Bedrock Agent invoked successfully in ${executionTime}ms`);

      return {
        success: true,
        output: completion.output,
        toolsUsed: completion.toolsUsed,
        sessionState: completion.sessionState,
        trace: completion.trace,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`❌ Bedrock Agent invocation failed after ${executionTime}ms:`, error);

      return {
        success: false,
        output: {
          message: 'Ne pare rău, nu am putut procesa cererea ta. Te rugăm să încerci din nou.',
        },
        error: error.message,
      };
    }
  }

  /**
   * Procesează stream-ul de răspuns de la Bedrock
   * @param isPrimaryInvocation - true pentru apelul principal, false pentru continuări (evită trimiterea duplicată către Elixir)
   */
  private async processBedrockStream(
    response: any, 
    context: ToolContext,
    sessionId: string,
    options: { streamChunks: boolean; sendCompletion: boolean } = { streamChunks: true, sendCompletion: true },
  ): Promise<{
    output: { message: string; actions?: any[] };
    toolsUsed: string[];
    sessionState: any;
    trace: any;
  }> {
    let outputText = '';
    const toolsUsed: string[] = [];
    let sessionState: any = null;
    const trace: any[] = [];
    const actions: any[] = [];
    let hasStreamedChunks = false;

    try {
      this.logger.log(`🔄 Starting to process event stream...`);
      
      // Process the event stream
      if (response.completion) {
        for await (const event of response.completion) {
          this.logger.log(`📦 Event received: ${JSON.stringify(Object.keys(event))}`);
          
          if (event.chunk) {
            // Text chunk from the model
            const chunk = event.chunk;
            if (chunk.bytes) {
              const text = new TextDecoder().decode(chunk.bytes);
              outputText += text;
              
              // Trimite chunk-ul în timp real prin Elixir când streaming-ul este activat
              if (options.streamChunks) {
                try {
                  hasStreamedChunks = true;
                  await this.elixirNotificationTool.execute({
                    toolName: 'send_elixir_notification',
                    parameters: {
                      businessId: context.businessId,
                      userId: context.userId,
                      sessionId: sessionId,
                      messageId: `chunk_${Date.now()}`,
                      content: text,
                      context: {
                        type: 'streaming_chunk',
                        isComplete: false,
                      },
                    },
                    context,
                  });
                } catch (error) {
                  // Nu oprim procesarea dacă trimiterea chunk-ului eșuează
                  this.logger.warn(`⚠️ Failed to send chunk to Elixir: ${error.message}`);
                }
              }
            }
          }

          if (event.trace) {
            // Trace information (tool usage, knowledge base retrieval, etc.)
            trace.push(event.trace);

            // Log the entire trace for debugging
            this.logger.log(`📊 Trace event received: ${JSON.stringify(event.trace, null, 2)}`);

            // Extract tool usage
            if (event.trace.orchestrationTrace) {
              const orchestration = event.trace.orchestrationTrace;
              
              if (orchestration.modelInvocationInput) {
                this.logger.log(`🔍 Model invocation input: ${JSON.stringify(orchestration.modelInvocationInput, null, 2)}`);
              }

              if (orchestration.rationale) {
                this.logger.log(`💭 Agent rationale: ${JSON.stringify(orchestration.rationale, null, 2)}`);
              }

              if (orchestration.invocationInput?.actionGroupInvocationInput) {
                const actionInput = orchestration.invocationInput.actionGroupInvocationInput;
                this.logger.log(`🔧 Tool called: ${actionInput.actionGroupName} -> ${actionInput.function}`);
                this.logger.log(`📝 Tool parameters: ${JSON.stringify(actionInput.parameters, null, 2)}`);
                toolsUsed.push(`${actionInput.actionGroupName}:${actionInput.function}`);
              }

              if (orchestration.observation?.actionGroupInvocationOutput) {
                const toolOutput = orchestration.observation.actionGroupInvocationOutput;
                this.logger.log(`✅ Tool output: ${toolOutput.text || 'unknown'}`);
                
                // Try to parse tool results as actions
                try {
                  const parsedOutput = JSON.parse(toolOutput.text || '{}');
                  if (parsedOutput.actions) {
                    actions.push(...parsedOutput.actions);
                  }
                } catch (e) {
                  // Not JSON, skip
                }
              }

              if (orchestration.observation?.knowledgeBaseLookupOutput) {
                const kbOutput = orchestration.observation.knowledgeBaseLookupOutput;
                this.logger.log(`📚 Knowledge Base retrieved ${kbOutput.retrievedReferences?.length || 0} references`);
              }

              if (orchestration.observation?.finalResponse) {
                this.logger.log(`💬 Final response: ${JSON.stringify(orchestration.observation.finalResponse, null, 2)}`);
              }
            }
          }

          if (event.returnControl) {
            // Agent is requesting to invoke action groups
            this.logger.log('🔄 Return control event received - processing tool invocations');
            
            // Execute tools and get results
            const toolResults = await this.executeReturnControlTools(
              event.returnControl,
              context,
              toolsUsed
            );
            
            // Only continue if we have tool results
            if (toolResults && toolResults.length > 0) {
              // Continue conversation with tool results
              this.logger.log('📤 Sending tool results back to Bedrock for continuation');
              
              const continuationResult = await this.continueConversationWithResults(
                sessionId,
                event.returnControl.invocationId,
                toolResults,
                context
              );
              
              // Merge results from continuation if successful
              if (continuationResult.success) {
                outputText += continuationResult.output.message;
                if (continuationResult.toolsUsed) {
                  toolsUsed.push(...continuationResult.toolsUsed);
                }
                if (continuationResult.sessionState) {
                  sessionState = continuationResult.sessionState;
                }
                if (continuationResult.trace) {
                  trace.push(...continuationResult.trace);
                }
                if (continuationResult.output.actions) {
                  actions.push(...continuationResult.output.actions);
                }
                
                this.logger.log('✅ Conversation continued successfully with tool results');
              } else {
                this.logger.error('❌ Continuation failed, using partial results');
                outputText = continuationResult.output.message;
              }
            } else {
              this.logger.warn('⚠️ No tool results to send back to Bedrock');
            }
          }
        }
      }

      sessionState = response.sessionState;
      
      this.logger.log(`✨ Stream processing complete. Tools used: ${toolsUsed.length}, Actions: ${actions.length}`);
      
      if (toolsUsed.length > 0) {
        this.logger.log(`🔧 Tools used in this invocation: ${JSON.stringify(toolsUsed)}`);
      }
    } catch (error) {
      this.logger.error('Error processing Bedrock stream:', error);
      throw error;
    }

    // Trimite notificare finală că mesajul este complet dacă este activat
    if (options.sendCompletion) {
      try {
        await this.elixirNotificationTool.execute({
          toolName: 'send_elixir_notification',
          parameters: {
            businessId: context.businessId,
            userId: context.userId,
            sessionId: sessionId,
            messageId: `complete_${Date.now()}`,
            // Evită trimiterea conținutului de două ori: dacă am făcut streaming la chunk-uri,
            // nu mai retrimitem conținutul complet la final.
            content: hasStreamedChunks ? '' : (outputText.trim() || 'Am procesat cererea ta.'),
            context: {
              type: 'streaming_complete',
              isComplete: true,
              toolsUsed,
              actions: actions.length > 0 ? actions : undefined,
            },
          },
          context,
        });
      } catch (error) {
        this.logger.warn(`⚠️ Failed to send completion notification to Elixir: ${error.message}`);
      }
    } else {
      this.logger.log(`⏭️ Skipping Elixir completion notification per options`);
    }

    return {
      output: {
        message: outputText.trim() || 'Am procesat cererea ta.',
        actions: actions.length > 0 ? actions : undefined,
      },
      toolsUsed,
      sessionState,
      trace,
    };
  }

  /**
   * Înlocuiește placeholders $session_attributes.X$ cu valorile reale din context
   */
  private replaceSessionAttributePlaceholders(params: any, context: ToolContext): void {
    const sessionAttributes = {
      businessId: context.businessId,
      locationId: context.locationId,
      userId: context.userId,
      role: context.role,
      businessType: context.businessType,
      source: context.source,
    };
    
    this.logger.log(`🔍 Checking for session attribute placeholders in params`);
    
    const replacePlaceholder = (value: any): any => {
      if (typeof value === 'string') {
        // Check if it contains session attribute placeholder
        if (value.includes('$session_attributes.')) {
          let replaced = value;
          
          // Replace all occurrences
          for (const [attrName, attrValue] of Object.entries(sessionAttributes)) {
            const placeholder = `$session_attributes.${attrName}$`;
            if (replaced.includes(placeholder)) {
              replaced = replaced.replace(new RegExp(`\\$session_attributes\\.${attrName}\\$`, 'g'), String(attrValue));
              this.logger.log(`🔄 Replaced ${placeholder} with ${attrValue}`);
            }
          }
          
          return replaced;
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively replace in objects and arrays
        if (Array.isArray(value)) {
          return value.map(item => replacePlaceholder(item));
        } else {
          const result = {};
          for (const [key, val] of Object.entries(value)) {
            result[key] = replacePlaceholder(val);
          }
          return result;
        }
      }
      return value;
    };
    
    // Replace placeholders in all parameters (mutate in place)
    for (const [key, value] of Object.entries(params)) {
      params[key] = replacePlaceholder(value);
    }
  }

  /**
   * Parse string în format "{key=value, key2={nested=value2}}" către obiect JavaScript
   */
  private parseBedrockParamString(str: string): any {
    if (!str || typeof str !== 'string') return str;
    
    // Clean string
    str = str.trim();
    
    if (!str.startsWith('{') || !str.endsWith('}')) {
      return str; // Not an object string
    }
    
    try {
      // Remove outer braces
      const content = str.slice(1, -1);
      
      // Parse manually because nested structures break simple replace
      const result: any = {};
      let currentKey = '';
      let currentValue = '';
      let depth = 0;
      let inValue = false;
      
      for (let i = 0; i < content.length; i++) {
        const char = content[i];
        
        if (char === '{') {
          depth++;
          if (inValue) currentValue += char;
        } else if (char === '}') {
          depth--;
          if (inValue) currentValue += char;
        } else if (char === '=' && depth === 0) {
          inValue = true;
        } else if (char === ',' && depth === 0) {
          // End of key-value pair
          if (currentKey && currentValue) {
            result[currentKey.trim()] = this.parseBedrockValue(currentValue.trim());
          }
          currentKey = '';
          currentValue = '';
          inValue = false;
        } else {
          if (inValue) {
            currentValue += char;
          } else {
            currentKey += char;
          }
        }
      }
      
      // Handle last pair
      if (currentKey && currentValue) {
        result[currentKey.trim()] = this.parseBedrockValue(currentValue.trim());
      }
      
      return result;
    } catch (e) {
      this.logger.warn(`⚠️ Failed to parse Bedrock param string: ${str}`);
      return str;
    }
  }
  
  /**
   * Parse individual value (poate fi string, number, nested object)
   */
  private parseBedrockValue(value: string): any {
    if (!value) return value;
    
    value = value.trim();
    
    // Nested object
    if (value.startsWith('{') && value.endsWith('}')) {
      return this.parseBedrockParamString(value);
    }
    
    // Array
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }
    
    // Number
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return parseFloat(value);
    }
    
    // Boolean
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    // String
    return value;
  }

  /**
   * Execută tools-urile cerute de Return Control event
   */
  private async executeReturnControlTools(
    returnControl: any,
    context: ToolContext,
    toolsUsed: string[]
  ): Promise<any[]> {
    const results: any[] = [];
    const invocationInputs = returnControl.invocationInputs || [];
    
    if (invocationInputs.length === 0) {
      this.logger.warn('⚠️ Return control event has no invocation inputs');
      return results;
    }
    
    this.logger.log(`🔧 Processing ${invocationInputs.length} invocation inputs`);
    
    for (const invocationInput of invocationInputs) {
      // Support both apiInvocationInput (new format) and actionGroupInvocationInput (old format)
      const apiInvocation = invocationInput.apiInvocationInput;
      const actionGroupInvocation = invocationInput.actionGroupInvocationInput;
      
      if (apiInvocation) {
        // New format: apiInvocationInput
        const actionGroupName = apiInvocation.actionGroup;
        const functionName = apiInvocation.apiPath?.replace(/^\//, '') || 'unknown'; // Remove leading /
        
        this.logger.log(`🔧 Executing tool locally: ${actionGroupName}::${functionName}`);
        
        // Parse parameters from requestBody.content['application/json'].properties
        const parsedParams: Record<string, any> = {};
        const properties = apiInvocation.requestBody?.content?.['application/json']?.properties || [];
        
        this.logger.log(`📋 Raw properties from Bedrock: ${JSON.stringify(properties, null, 2)}`);
        
        for (const prop of properties) {
          let value = prop.value;
          
          // Check if value is a string that looks like an object/array
          if (typeof value === 'string') {
            // Try to parse Bedrock format: "{key=value, nested={key2=value2}}"
            if (value.startsWith('{') && value.includes('=')) {
              const parsed = this.parseBedrockParamString(value);
              if (typeof parsed === 'object') {
                value = parsed;
                this.logger.log(`🔄 Parsed Bedrock string to object: ${prop.name}`);
              }
            }
            // Try to parse standard JSON strings
            else if (value.startsWith('{') || value.startsWith('[')) {
              try {
                value = JSON.parse(value);
                this.logger.log(`🔄 Parsed JSON string: ${prop.name}`);
              } catch (e) {
                // Keep as string if not valid JSON
              }
            }
          }
          
          parsedParams[prop.name] = value;
        }
        
        // Special handling: Restructure parameters for app server
        // Bedrock puts: params="{filters={date={$gte=X, $lte=Y}}, resourceType=Z}" or params="{date=X}"
        // We need: resourceType=Z (root level), params={startDate: X, endDate: Y}
        if (parsedParams.params && typeof parsedParams.params === 'object') {
          this.logger.log(`🔍 Restructuring nested params: ${JSON.stringify(parsedParams.params)}`);
          
          const restructuredParams: any = {};
          
          // Extract resourceType to root level (for header X-Resource-Type)
          if (parsedParams.params.resourceType && !parsedParams.resourceType) {
            this.logger.log(`🔄 Extracting resourceType to root: ${parsedParams.params.resourceType}`);
            parsedParams.resourceType = parsedParams.params.resourceType;
          }
          
          // Handle simple date parameter: date=2025-10-11 → startDate & endDate
          if (parsedParams.params.date && typeof parsedParams.params.date === 'string') {
            restructuredParams.startDate = parsedParams.params.date;
            restructuredParams.endDate = parsedParams.params.date;
            this.logger.log(`🔄 Converted date param to startDate/endDate: ${parsedParams.params.date}`);
          }
          // Extract date filters to startDate/endDate in params
          else if (parsedParams.params.filters && typeof parsedParams.params.filters === 'object') {
            if (parsedParams.params.filters.date && typeof parsedParams.params.filters.date === 'object') {
              const dateFilters = parsedParams.params.filters.date;
              
              if (dateFilters.$gte || dateFilters['$gte']) {
                restructuredParams.startDate = dateFilters.$gte || dateFilters['$gte'];
                this.logger.log(`🔄 Extracted startDate: ${restructuredParams.startDate}`);
              }
              
              if (dateFilters.$lte || dateFilters['$lte']) {
                restructuredParams.endDate = dateFilters.$lte || dateFilters['$lte'];
                this.logger.log(`🔄 Extracted endDate: ${restructuredParams.endDate}`);
              }
            }
            
            // Keep other filters if any
            for (const [key, val] of Object.entries(parsedParams.params.filters)) {
              if (key !== 'date') {
                restructuredParams[key] = val;
              }
            }
          }
          
          // Keep any other params (except date, resourceType, filters which we've processed)
          for (const [key, val] of Object.entries(parsedParams.params)) {
            if (key !== 'resourceType' && key !== 'filters' && key !== 'date') {
              restructuredParams[key] = val;
            }
          }
          
          // Replace params with restructured version
          if (Object.keys(restructuredParams).length > 0) {
            parsedParams.params = restructuredParams;
          } else {
            delete parsedParams.params;
          }
        }
        
        // Replace session attribute placeholders with actual values
        // Bedrock sometimes sends literal "$session_attributes.businessId$" instead of actual values
        this.replaceSessionAttributePlaceholders(parsedParams, context);
        
        this.logger.log(`📝 Tool parameters (final): ${JSON.stringify(parsedParams, null, 2)}`);
        
        // Execute tool using ToolExecutorService
        try {
          const toolResult = await this.toolExecutorService.executeTool({
            toolName: functionName,
            parameters: parsedParams,
            context,
          });
          
          this.logger.log(`✅ Tool executed successfully: ${functionName}`);
          this.logger.log(`📊 Tool result: ${JSON.stringify(toolResult, null, 2)}`);
          
          toolsUsed.push(`${actionGroupName}:${functionName}`);
          
          // Store result for return to Bedrock
          results.push({
            actionGroupName,
            functionName,
            apiPath: apiInvocation.apiPath,
            httpMethod: apiInvocation.httpMethod,
            invocationInputMember: invocationInput,
            ...toolResult,
          });
          
        } catch (error) {
          this.logger.error(`❌ Tool execution failed: ${functionName}`, error);
          
          // Store error result
          results.push({
            actionGroupName,
            functionName,
            apiPath: apiInvocation.apiPath,
            httpMethod: apiInvocation.httpMethod,
            invocationInputMember: invocationInput,
            success: false,
            error: error.message,
          });
        }
        
      } else if (actionGroupInvocation) {
        // Old format: actionGroupInvocationInput (legacy support)
        const { actionGroupName, function: functionName, parameters } = actionGroupInvocation;
        
        this.logger.log(`🔧 Executing tool locally (legacy format): ${actionGroupName}::${functionName}`);
        
        const parsedParams: Record<string, any> = {};
        if (parameters) {
          for (const param of parameters) {
            parsedParams[param.name] = param.value;
          }
        }
        
        this.logger.log(`📝 Tool parameters: ${JSON.stringify(parsedParams, null, 2)}`);
        
        try {
          const toolResult = await this.toolExecutorService.executeTool({
            toolName: functionName,
            parameters: parsedParams,
            context,
          });
          
          this.logger.log(`✅ Tool executed successfully: ${functionName}`);
          toolsUsed.push(`${actionGroupName}:${functionName}`);
          
          results.push({
            actionGroupName,
            functionName,
            invocationInputMember: invocationInput,
            ...toolResult,
          });
          
        } catch (error) {
          this.logger.error(`❌ Tool execution failed: ${functionName}`, error);
          results.push({
            actionGroupName,
            functionName,
            invocationInputMember: invocationInput,
            success: false,
            error: error.message,
          });
        }
        
      } else {
        this.logger.warn(`⚠️ Unknown invocation input format`);
        this.logger.warn(`Available properties: ${JSON.stringify(Object.keys(invocationInput))}`);
      }
    }
  
  this.logger.log(`📊 Executed ${results.length} tools successfully`);
  return results;
}

  /**
   * Continuă conversația cu Bedrock trimițând rezultatele tools-urilor
   */
  private async continueConversationWithResults(
    sessionId: string,
    invocationId: string,
    toolResults: any[],
    context: ToolContext
  ): Promise<BedrockInvocationResult> {
    try {
      this.logger.log(`🔄 Continuing conversation with ${toolResults.length} tool results`);
      
      // Format results for Bedrock
      const returnControlResults = toolResults.map(result => {
        const resultBody = JSON.stringify({
          success: result.success !== false,
          data: result.data,
          error: result.error,
        });
        
        // Support both new apiResult format and legacy functionResult format
        if (result.apiPath && result.httpMethod) {
          // New format for apiInvocationInput
          // IMPORTANT: Always return 200 even on errors, with success: false in body
          // This allows Bedrock to continue the conversation and inform the user
          return {
            apiResult: {
              actionGroup: result.actionGroupName,
              apiPath: result.apiPath,
              httpMethod: result.httpMethod,
              httpStatusCode: 200, // Always 200, errors are in response body
              responseBody: {
                'application/json': {
                  body: resultBody
                }
              },
            }
          };
        } else {
          // Legacy format for actionGroupInvocationInput
          return {
            functionResult: {
              actionGroup: result.actionGroupName,
              function: result.functionName,
              responseBody: {
                TEXT: {
                  body: resultBody
                }
              },
              responseState: result.success !== false ? 'REPROMPT' : 'FAILURE',
            }
          };
        }
      });
      
      // Create continuation command
      const command = new InvokeAgentCommand({
        agentId: this.config.agentId,
        agentAliasId: this.config.agentAliasId,
        sessionId,
        inputText: '', // Empty text for continuation
        sessionState: {
          invocationId,
          returnControlInvocationResults: returnControlResults as any, // Type cast due to AWS SDK complex union types
          sessionAttributes: {
            businessId: context.businessId,
            locationId: context.locationId,
            userId: context.userId,
            role: context.role,
            businessType: context.businessType || 'dental',
            source: context.source,
          },
        },
        enableTrace: true,
      });
      
      this.logger.log('📤 Sending continuation request to Bedrock...');
      
      const response = await this.bedrockClient.send(command);
      
      // Process the continuation response (isPrimaryInvocation = false pentru a evita notificări duplicate)
      const completion = await this.processBedrockStream(
        response,
        context,
        sessionId,
        { streamChunks: false, sendCompletion: false }
      );
      
      return {
        success: true,
        output: completion.output,
        toolsUsed: completion.toolsUsed,
        sessionState: completion.sessionState,
        trace: completion.trace,
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to continue conversation with results:', error);
      
      return {
        success: false,
        output: {
          message: 'Am executat acțiunile cerute, dar nu am putut genera răspunsul final.',
        },
        toolsUsed: [],
        sessionState: null,
        trace: [],
        error: error.message,
      };
    }
  }

  /**
   * Retrieve direct din Knowledge Base (fără agent)
   */
  async retrieveFromKnowledgeBase(
    query: string,
    numberOfResults: number = 5,
  ): Promise<any> {
    try {
      if (!this.config.knowledgeBaseId) {
        this.logger.warn('Knowledge Base ID not configured');
        return { success: false, error: 'Knowledge Base not configured' };
      }

      const command = new RetrieveCommand({
        knowledgeBaseId: this.config.knowledgeBaseId,
        retrievalQuery: {
          text: query,
        },
        retrievalConfiguration: {
          vectorSearchConfiguration: {
            numberOfResults,
          },
        },
      });

      const response = await this.bedrockClient.send(command);

      return {
        success: true,
        results: response.retrievalResults || [],
      };
    } catch (error) {
      this.logger.error('Error retrieving from Knowledge Base:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get Bedrock configuration
   */
  getConfig(): BedrockConfig {
    return { ...this.config };
  }
}

