import { Injectable, Logger } from '@nestjs/common';
import { ToolDefinition, ToolInput, ToolResult, ToolExecutor } from '../interfaces';
import axios from 'axios';

/**
 * App Server Tool - DOAR pentru citire/query de date
 * 
 * 2 Module principale:
 * 1. patient-booking - pentru customers (verificare disponibilitate, servicii, istoric)
 * 2. resources - pentru operators (listare și citire resurse)
 * 
 * IMPORTANT: Tool-ul este READ-ONLY!
 * Pentru modificări (create, update, delete) folosește call_frontend_function
 */
@Injectable()
export class AppServerTool implements ToolExecutor {
  private readonly logger = new Logger(AppServerTool.name);
  private readonly appServerUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.appServerUrl = process.env.API_SERVER_URL || 'http://localhost:3000';
    this.apiKey = process.env.AI_SERVER_KEY || ''; // AI_SERVER_KEY for internal auth
  }

  getDefinition(): ToolDefinition {
    return {
      name: 'query_app_server',
      description: `READ-ONLY queries to app server. For modifications use call_frontend_function instead.

1. PATIENT-BOOKING (for customers/patients):
   - Get available services (treatments offered)
   - Check time slots availability for specific date
   - View appointment history (requires access code)
   Routes: /patient-booking/services, /slots/:date, /appointments/history
   Note: For detailed medic/treatment info, use resources module with resourceType

2. RESOURCES (for operators):
   - List resources (appointments, patients, treatments, medics, etc.)
   - Get specific resource details
   - Requires X-Resource-Type header
   - Requires authentication
   Routes: /resources/{businessId}-{locationId}
   
IMPORTANT: This tool is READ-ONLY. Use call_frontend_function for create/update/delete operations.`,
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            module: {
              type: 'string',
              enum: ['patient-booking', 'resources'],
              description: 'Module to query: patient-booking (for customers) or resources (for operators)',
            },
            action: {
              type: 'string',
              description: 'READ-ONLY action: services, slots, history (patient-booking) or list, get (resources with resourceType). For modifications use call_frontend_function.',
            },
            businessId: {
              type: 'string',
              description: 'Business ID',
            },
            locationId: {
              type: 'string',
              description: 'Location ID',
            },
            resourceType: {
              type: 'string',
              description: 'Resource type (REQUIRED for resources module): appointment, patient, treatment, medic, service, etc.',
            },
            resourceId: {
              type: 'string',
              description: 'Resource ID (for get action only)',
            },
            params: {
              type: 'object',
              description: 'Query parameters (filters, pagination, date ranges, etc.)',
            },
            accessCode: {
              type: 'string',
              description: 'Patient access code (for patient-booking history)',
            },
          },
          required: ['module', 'action', 'businessId', 'locationId'],
        },
      },
    };
  }

  async execute(input: ToolInput): Promise<ToolResult> {
    const { parameters, context } = input;
    const { 
      module, 
      action, 
      businessId, 
      locationId, 
      resourceType, 
      resourceId,
      params,
      accessCode 
    } = parameters;

    try {
      const targetBusinessId = businessId || context.businessId;
      const targetLocationId = locationId || context.locationId;

      // Build URL based on module
      let url: string;
      let method: string;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (module === 'patient-booking') {
        // PATIENT-BOOKING MODULE (READ-ONLY public endpoints for customers)
        method = 'GET';
        
        switch (action) {
          case 'services':
            url = `${this.appServerUrl}/patient-booking/services/${targetBusinessId}-${targetLocationId}`;
            break;
          case 'slots':
            if (!params?.date) {
              return {
                success: false,
                error: 'date parameter is required for slots action (format: YYYY-MM-DD)',
              };
            }
            url = `${this.appServerUrl}/patient-booking/slots/${params.date}/${targetBusinessId}-${targetLocationId}`;
            break;
          case 'history':
            url = `${this.appServerUrl}/patient-booking/appointments/history/${targetBusinessId}-${targetLocationId}`;
            if (accessCode) {
              headers['x-access-code'] = accessCode;
            }
            break;
          default:
            return {
              success: false,
              error: `Unknown patient-booking action: ${action}. Valid READ-ONLY actions: services, slots, history. For medics/treatments details use resources module with resourceType. For reservations use call_frontend_function.`,
            };
        }
      } else if (module === 'resources') {
        // RESOURCES MODULE (READ-ONLY for operators, requires auth)
        if (!resourceType) {
          return {
            success: false,
            error: 'resourceType is required for resources module (appointment, patient, treatment, medic, service, etc.)',
          };
        }

        url = `${this.appServerUrl}/resources/${targetBusinessId}-${targetLocationId}`;
        headers['X-Resource-Type'] = resourceType;
        
        // Add AI-SERVER-KEY for internal authentication
        if (this.apiKey) {
          headers['ai-server-key'] = this.apiKey;
        }

        method = 'GET';

        switch (action) {
          case 'list':
            // Just list, params handled below
            break;
          case 'get':
            if (!resourceId) {
              return {
                success: false,
                error: 'resourceId is required for get action',
              };
            }
            url += `/${resourceId}`;
            break;
          default:
            return {
              success: false,
              error: `Unknown resources action: ${action}. Valid READ-ONLY actions: list, get. For modifications use call_frontend_function.`,
            };
        }
      } else {
        return {
          success: false,
          error: `Unknown module: ${module}. Valid modules: patient-booking, resources`,
        };
      }

      this.logger.log(`📡 Querying ${module}: ${method} ${url}`);

      const config = {
        method: 'get', // Always GET (read-only)
        url,
        headers,
        params: params || undefined,
        timeout: 30000,
      };

      const response = await axios(config);

      this.logger.log(`✅ App server query successful: ${response.status}`);

      return {
        success: true,
        data: {
          statusCode: response.status,
          data: response.data,
          module,
          action,
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ App server query failed:`, error.message);

      return {
        success: false,
        error: error.response?.data?.message || error.message,
        data: {
          statusCode: error.response?.status,
          details: error.response?.data,
        },
      };
    }
  }
}

