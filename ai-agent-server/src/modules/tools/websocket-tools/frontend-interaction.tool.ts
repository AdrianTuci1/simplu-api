import { Injectable, Logger } from '@nestjs/common';
import { ToolDefinition, ToolInput, ToolResult, ToolExecutor } from '../interfaces';
import axios from 'axios';

/**
 * Frontend Interaction Tool - apelează funcții din frontend care fac API calls
 * 
 * Tool-ul trimite comenzi către frontend prin Elixir Notification Hub
 * care gestionează API-urile (createAppointment, updatePatient, etc.)
 * 
 * Flux:
 * 1. AI Agent → HTTP POST → Elixir /api/ai-responses
 * 2. Elixir → WebSocket broadcast → Frontend
 * 3. Frontend execută funcția → WebSocket → Elixir
 * 4. Elixir → HTTP POST → AI Agent /api/frontend-responses
 * 5. AI Agent continuă conversația
 */
@Injectable()
export class FrontendInteractionTool implements ToolExecutor {
  private readonly logger = new Logger(FrontendInteractionTool.name);
  private readonly elixirUrl: string;

  constructor() {
    this.elixirUrl = process.env.ELIXIR_HTTP_URL || 'http://localhost:4000';
  }

  getDefinition(): ToolDefinition {
    return {
      name: 'call_frontend_function',
      description: `Call JavaScript functions in the frontend that handle API operations. 
      
The frontend sends context with each message (current menu, edited resource). 
Based on conversation, AI calls frontend functions to complete actions.

COMMON FUNCTIONS:
- createResource(type, data) - Create new resource (appointment, patient, etc.)
- updateResource(type, id, data) - Update existing resource
- deleteResource(type, id) - Delete resource
- submitForm() - Submit the currently open form
- navigateTo(view) - Navigate to a view
- selectResource(type, id) - Select a resource
- closeModal() - Close current modal/form

EXAMPLES:
User: "Creează programare pentru Ion Popescu mâine la 14:00"
AI calls: createResource('appointment', {patient: 'Ion Popescu', date: '2024-01-21', time: '14:00'})

User: "Schimbă data la 15:00" (while editing appointment)
AI calls: updateResource('appointment', currentId, {time: '15:00'})

The functions in frontend will make the actual API calls to app server.`,
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            functionName: {
              type: 'string',
              description: 'Function to call in frontend (createResource, updateResource, deleteResource, submitForm, navigateTo, selectResource, etc.)',
            },
            parameters: {
              type: 'object',
              description: 'Parameters to pass to the function',
              properties: {
                resourceType: {
                  type: 'string',
                  description: 'Resource type (appointment, patient, treatment, medic, service, etc.)',
                },
                resourceId: {
                  type: 'string',
                  description: 'Resource ID (for update, delete, select)',
                },
                data: {
                  type: 'object',
                  description: 'Data to create or update (resource fields)',
                },
                view: {
                  type: 'string',
                  description: 'View to navigate to (appointments, patients, calendar, etc.)',
                },
              },
            },
            businessId: {
              type: 'string',
              description: 'Business ID',
            },
            locationId: {
              type: 'string',
              description: 'Location ID',
            },
            sessionId: {
              type: 'string',
              description: 'Session ID',
            },
          },
          required: ['functionName'],
        },
      },
    };
  }

  async execute(input: ToolInput): Promise<ToolResult> {
    const { parameters, context } = input;
    const { functionName, parameters: functionParams, businessId, locationId, sessionId } = parameters;

    try {
      if (!functionName) {
        return {
          success: false,
          error: 'functionName is required',
        };
      }

      this.logger.log(`🖥️ Calling frontend function via Elixir: ${functionName}`);

      const targetBusinessId = businessId || context.businessId;
      const targetLocationId = locationId || context.locationId;
      const targetSessionId = sessionId || context.sessionId;
      const targetUserId = context.userId;

      // Prepare function call payload pentru Elixir
      const url = `${this.elixirUrl}/api/ai-responses`;
      
      const payload = {
        tenant_id: targetBusinessId,
        user_id: targetUserId,
        session_id: targetSessionId,
        message_id: `function_${Date.now()}`,
        content: `Calling frontend function: ${functionName}`,
        context: {
          type: 'function_call',
          functionName,
          parameters: functionParams || {},
          locationId: targetLocationId,
        },
        timestamp: new Date().toISOString(),
        type: 'function_call', // Tip special pentru function calls
      };

      this.logger.log(`📤 Sending function call to Elixir: ${url}`);
      this.logger.log(`📋 Payload: ${JSON.stringify(payload, null, 2)}`);

      // Trimite către Elixir care va broadcast către frontend
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      this.logger.log(`✅ Frontend function call sent via Elixir: ${functionName}`);
      this.logger.log(`📊 Elixir response: ${response.status}`);

      return {
        success: true,
        data: {
          functionName,
          parameters: functionParams,
          timestamp: new Date().toISOString(),
          message: `Function ${functionName} sent to frontend via Elixir. Waiting for frontend response...`,
          elixirStatus: response.status,
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ Frontend function call failed:`, error.message);

      return {
        success: false,
        error: error.message,
        data: {
          statusCode: error.response?.status,
        },
      };
    }
  }
}

