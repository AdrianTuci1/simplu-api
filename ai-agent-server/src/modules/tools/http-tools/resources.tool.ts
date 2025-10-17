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

Specialization for treatments (resourceType=treatment):
- Default limit = 60 if not provided
- Filters:
  * treatmentType → maps to data.treatmentType
  * name → maps to data.treatmentName
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

    // Normalize params for treatments: set default limit and map friendly keys
    const normalizedParams: Record<string, unknown> | undefined = (() => {
      if (!safeParams) return undefined;
      if (resourceType !== 'treatment') return safeParams;

      const copy: Record<string, unknown> = { ...safeParams };

      if (copy['treatmentType'] && copy['data.treatmentType'] === undefined) {
        copy['data.treatmentType'] = copy['treatmentType'];
        delete copy['treatmentType'];
      }
      if (copy['name'] && copy['data.treatmentName'] === undefined) {
        copy['data.treatmentName'] = copy['name'];
        delete copy['name'];
      }
      if (copy['limit'] === undefined) {
        copy['limit'] = 60;
      }
      return copy;
    })();

    let finalUrl = url;
    if (normalizedParams && Object.keys(normalizedParams).length > 0) {
      const queryParts: string[] = [];

      if ((normalizedParams as any).startDate !== undefined && (normalizedParams as any).startDate !== null) {
        queryParts.push(`startDate=${encodeURIComponent(String((normalizedParams as any).startDate))}`);
      }
      if ((normalizedParams as any).endDate !== undefined && (normalizedParams as any).endDate !== null) {
        queryParts.push(`endDate=${encodeURIComponent(String((normalizedParams as any).endDate))}`);
      }

      for (const [key, value] of Object.entries(normalizedParams)) {
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
