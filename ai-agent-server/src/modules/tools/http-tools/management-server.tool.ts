import { Injectable, Logger } from '@nestjs/common';
import { ToolDefinition, ToolInput, ToolResult, ToolExecutor } from '../interfaces';
import axios from 'axios';

/**
 * Management Server Tool - comunică cu management server pentru configurări și setări business
 */
@Injectable()
export class ManagementServerTool implements ToolExecutor {
  private readonly logger = new Logger(ManagementServerTool.name);
  private readonly managementServerUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.managementServerUrl = process.env.MANAGEMENT_SERVER_URL || 'http://localhost:3001';
    this.apiKey = process.env.MANAGEMENT_SERVER_API_KEY || process.env.API_SERVER_KEY || '';
  }

  getDefinition(): ToolDefinition {
    return {
      name: 'query_management_server',
      description: `Query management server for business CONFIGURATION and SETTINGS only.

DO NOT USE THIS FOR:
- Services/treatments (use query_app_server with module: patient-booking)
- Appointments (use query_app_server with module: resources, resourceType: appointment)
- Patients (use query_app_server)
- Medics (use query_app_server)

USE THIS ONLY FOR:
- Business configuration and settings
- Subscription information
- User invitations
- Administrative data
- Business hours and policies

EXAMPLES:
- "What are the business settings?" → endpoint: "/api/businesses/{id}"
- "Check subscription status" → endpoint: "/api/subscriptions"
- "Get invited users" → endpoint: "/api/invitations"`,
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            endpoint: {
              type: 'string',
              description: 'The API endpoint to query (e.g., /api/businesses, /api/subscriptions)',
            },
            method: {
              type: 'string',
              enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
              description: 'HTTP method to use',
            },
            params: {
              type: 'object',
              description: 'Query parameters for GET requests',
            },
            body: {
              type: 'object',
              description: 'Request body for POST/PUT/PATCH requests',
            },
            tenantId: {
              type: 'string',
              description: 'Business ID (tenant ID) for multi-tenant queries',
            },
          },
          required: ['endpoint', 'method'],
        },
      },
    };
  }

  async execute(input: ToolInput): Promise<ToolResult> {
    const { parameters, context } = input;
    const { endpoint, method, params, body, tenantId } = parameters;

    try {
      this.logger.log(`📡 Querying management server: ${method} ${endpoint}`);

      const url = `${this.managementServerUrl}${endpoint}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'x-tenant-id': tenantId || context.businessId,
      };

      const config = {
        method: method.toLowerCase(),
        url,
        headers,
        params: method === 'GET' ? params : undefined,
        data: ['POST', 'PUT', 'PATCH'].includes(method) ? body : undefined,
        timeout: 30000,
      };

      const response = await axios(config);

      this.logger.log(`✅ Management server query successful: ${response.status}`);

      return {
        success: true,
        data: {
          statusCode: response.status,
          data: response.data,
          headers: response.headers,
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ Management server query failed:`, error.message);

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

