import { Injectable, Logger } from '@nestjs/common';
import { 
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
  RetrieveCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { BedrockInvocationResult, ToolContext } from '../interfaces';

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

  constructor() {
    this.config = {
      agentId: process.env.BEDROCK_AGENT_ID || '',
      agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID || 'TSTALIASID',
      knowledgeBaseId: process.env.BEDROCK_KNOWLEDGE_BASE_ID || '',
      region: process.env.AWS_BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1',
      modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0',
    };

    this.bedrockClient = new BedrockAgentRuntimeClient({
      region: this.config.region,
    });

    this.logger.log(`🤖 Bedrock Agent Service initialized with agent: ${this.config.agentId}`);
  }

  /**
   * Invocă Bedrock Agent cu un mesaj
   */
  async invokeAgent(
    message: string,
    context: ToolContext,
    sessionId?: string,
  ): Promise<BedrockInvocationResult> {
    const startTime = Date.now();

    try {
      this.logger.log(`📤 Invoking Bedrock Agent for session: ${sessionId || context.sessionId}`);

      const command = new InvokeAgentCommand({
        agentId: this.config.agentId,
        agentAliasId: this.config.agentAliasId,
        sessionId: sessionId || context.sessionId,
        inputText: message,
        sessionState: {
          sessionAttributes: {
            businessId: context.businessId,
            locationId: context.locationId,
            userId: context.userId,
            role: context.role,
            businessType: context.businessType || 'dental',
            source: context.source,
          },
        },
        enableTrace: true, // Pentru debugging
      });

      const response = await this.bedrockClient.send(command);

      // Process streaming response
      const completion = await this.processBedrockStream(response);

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
   */
  private async processBedrockStream(response: any): Promise<{
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

    try {
      // Process the event stream
      if (response.completion) {
        for await (const event of response.completion) {
          if (event.chunk) {
            // Text chunk from the model
            const chunk = event.chunk;
            if (chunk.bytes) {
              const text = new TextDecoder().decode(chunk.bytes);
              outputText += text;
            }
          }

          if (event.trace) {
            // Trace information (tool usage, knowledge base retrieval, etc.)
            trace.push(event.trace);

            // Extract tool usage
            if (event.trace.orchestrationTrace) {
              const orchestration = event.trace.orchestrationTrace;
              
              if (orchestration.modelInvocationInput) {
                this.logger.debug('Model invocation input:', orchestration.modelInvocationInput);
              }

              if (orchestration.observation?.actionGroupInvocationOutput) {
                const toolOutput = orchestration.observation.actionGroupInvocationOutput;
                this.logger.log(`🔧 Tool executed: ${toolOutput.text || 'unknown'}`);
                
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
            }
          }

          if (event.returnControl) {
            // Agent is requesting to invoke an action group
            this.logger.warn('⚠️ Return control event received - not yet implemented');
          }
        }
      }

      sessionState = response.sessionState;
    } catch (error) {
      this.logger.error('Error processing Bedrock stream:', error);
      throw error;
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

