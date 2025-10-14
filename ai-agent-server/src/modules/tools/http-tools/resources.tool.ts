import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ToolDefinition, ToolExecutor, ToolInput, ToolResult } from '../interfaces';

@Injectable()
export class ResourcesQueryTool implements ToolExecutor {
  private readonly logger = new Logger(ResourcesQueryTool.name);
  private readonly appServerUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.appServerUrl = process.env.API_SERVER_URL || 'http://localhost:3000';
    this.apiKey = process.env.AI_SERVER_KEY || '';
  }

  getDefinition(): ToolDefinition {
    return {
      name: 'query_resources',
      description: `READ-ONLY list/get resources for operators via /api/resources.

REQUIRES header x-resource-type with the resource kind (appointment, patient, treatment, medic, service, setting, ...).
Supports filters, pagination, and date ranges via query params.
`,
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            businessId: { type: 'string' },
            locationId: { type: 'string' },
            action: { type: 'string', enum: ['list', 'get'] },
            resourceType: { type: 'string' },
            resourceId: { type: 'string' },
            params: { type: 'object' },
          },
          required: ['businessId', 'locationId', 'action', 'resourceType'],
        },
      },
    };
  }

  async execute(input: ToolInput): Promise<ToolResult> {
    const { parameters } = input;

    this.logger.log(`📋 ResourcesQueryTool received parameters: ${JSON.stringify(parameters, null, 2)}`);

    const { businessId, locationId, action, resourceType, resourceId, params } = parameters as any;

    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-resource-type': resourceType };
    if (this.apiKey) headers['ai-server-key'] = this.apiKey;

    let url = `${this.appServerUrl}/api/resources/${businessId}-${locationId}`;
    if (action === 'get') {
      if (!resourceId) {
        return { success: false, error: 'resourceId is required for get', data: { statusCode: 400 } };
      }
      url += `/${resourceId}`;
    }

    const safeParams: Record<string, unknown> | undefined = typeof params === 'object' && params !== null ? (params as Record<string, unknown>) : undefined;

    let finalUrl = url;
    if (safeParams && Object.keys(safeParams).length > 0) {
      const queryParts: string[] = [];

      if ((safeParams as any).startDate !== undefined && (safeParams as any).startDate !== null) {
        queryParts.push(`startDate=${encodeURIComponent(String((safeParams as any).startDate))}`);
      }
      if ((safeParams as any).endDate !== undefined && (safeParams as any).endDate !== null) {
        queryParts.push(`endDate=${encodeURIComponent(String((safeParams as any).endDate))}`);
      }

      for (const [key, value] of Object.entries(safeParams)) {
        if (key !== 'startDate' && key !== 'endDate' && value !== undefined && value !== null) {
          queryParts.push(`${key}=${encodeURIComponent(String(value))}`);
        }
      }

      if (queryParts.length > 0) {
        finalUrl += '?' + queryParts.join('&');
      }
    }

    try {
      this.logger.log(`📡 Querying resources: GET ${finalUrl}`);
      const response = await axios({ method: 'get', url: finalUrl, headers, timeout: 30000 });
      return { success: true, data: { statusCode: response.status, data: response.data, action, resourceType } };
    } catch (error: any) {
      this.logger.error('❌ Resources query failed:', error.message);
      return { success: false, error: error.response?.data?.message || error.message, data: { statusCode: error.response?.status, details: error.response?.data } };
    }
  }
}
