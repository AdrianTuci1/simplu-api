import { Injectable, Logger } from '@nestjs/common';
import { ToolDefinition, ToolInput, ToolResult, ToolExecutor } from '../interfaces';

/**
 * Frontend Interaction Tool - apelează funcții din frontend care fac API calls
 * 
 * Tool-ul trimite comenzi către frontend pentru a executa funcții JavaScript
 * care gestionează API-urile (createAppointment, updatePatient, etc.)
 * 
 * Frontend-ul primește context când trimite mesajul (ce meniu e deschis, ce resursă editează)
 * AI-ul poate apoi să apeleze funcții în frontend pentru a finaliza acțiuni
 */
@Injectable()
export class FrontendInteractionTool implements ToolExecutor {
  private readonly logger = new Logger(FrontendInteractionTool.name);
  private wsGateway: any = null; // Will be set by ToolsModule

  setWebSocketGateway(gateway: any): void {
    this.wsGateway = gateway;
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
      if (!this.wsGateway) {
        this.logger.error('❌ WebSocket Gateway not initialized');
        return {
          success: false,
          error: 'WebSocket Gateway not available',
        };
      }

      if (!functionName) {
        return {
          success: false,
          error: 'functionName is required',
        };
      }

      this.logger.log(`🖥️ Calling frontend function: ${functionName}`);

      const targetBusinessId = businessId || context.businessId;
      const targetLocationId = locationId || context.locationId;
      const targetSessionId = sessionId || context.sessionId;

      // Prepare function call payload
      const payload = {
        type: 'function_call',
        functionName,
        parameters: functionParams || {},
        timestamp: new Date().toISOString(),
      };

      // Send function call to frontend via WebSocket
      await this.wsGateway.sendMessageToSession?.(
        targetBusinessId,
        targetSessionId,
        {
          event: 'ai_function_call',
          data: payload,
        },
        targetLocationId
      );

      this.logger.log(`✅ Frontend function call sent: ${functionName}`);

      return {
        success: true,
        data: {
          functionName,
          parameters: functionParams,
          timestamp: new Date().toISOString(),
          message: `Function ${functionName} called in frontend. Frontend will execute and handle API calls.`,
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ Frontend function call failed:`, error.message);

      return {
        success: false,
        error: error.message,
      };
    }
  }
}

