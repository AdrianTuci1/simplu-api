import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ToolDefinition, ToolExecutor, ToolInput, ToolResult } from '../interfaces';

@Injectable()
export class PatientBookingQueryTool implements ToolExecutor {
  private readonly logger = new Logger(PatientBookingQueryTool.name);
  private readonly appServerUrl: string;

  constructor() {
    this.appServerUrl = process.env.API_SERVER_URL || 'http://localhost:3000';
  }

  getDefinition(): ToolDefinition {
    return {
      name: 'query_patient_booking',
      description: `READ-ONLY patient booking queries via /api/patient-booking.
Actions: available-dates (from,to), day-slots (date, optional: serviceId, medicId).
Note: For services/treatments list, use query_resources with resourceType: "treatment".`,
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            businessId: { type: 'string' },
            locationId: { type: 'string' },
            action: { type: 'string', enum: ['available-dates', 'day-slots', 'history'] },
            params: { type: 'object' },
            accessCode: { type: 'string' },
          },
          required: ['businessId', 'locationId', 'action'],
        },
      },
    };
  }

  async execute(input: ToolInput): Promise<ToolResult> {
    const { parameters, context } = input;
    this.logger.log(`📋 PatientBookingQueryTool received parameters: ${JSON.stringify(parameters, null, 2)}`);

    const { businessId, locationId, action, params, accessCode } = parameters as any;

    let url: string = '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (action === 'history' && accessCode) {
      headers['x-access-code'] = accessCode;
    }

    const safeParams: Record<string, unknown> = typeof params === 'object' && params !== null ? (params as Record<string, unknown>) : {};

    // Fallback: dacă lipsește params.date pentru day-slots, încearcă să-l iei din context.view
    if (action === 'day-slots' && !safeParams.date) {
      const dateFromContext = (context as any)?.view?.selectedDate || (context as any)?.view?.date || (context as any)?.view?.dateISO;
      if (dateFromContext) {
        this.logger.log(`🧭 Using date from context.view as fallback: ${dateFromContext}`);
        safeParams.date = dateFromContext;
      }
    }

    switch (action) {
      case 'available-dates':
        url = `${this.appServerUrl}/api/patient-booking/available-dates/${businessId}-${locationId}`;
        break;
      case 'day-slots':
        if (!safeParams?.date) {
          return { success: false, error: 'date is required for day-slots (YYYY-MM-DD)' };
        }
        url = `${this.appServerUrl}/api/patient-booking/day-slots/${businessId}-${locationId}/${safeParams.date}`;
        break;
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }

    // Build query params, excluding path params (date for day-slots)
    let finalUrl = url;
    if (safeParams && Object.keys(safeParams).length > 0) {
      const queryParts: string[] = [];
      const exclude = new Set(['date']);
      for (const [key, value] of Object.entries(safeParams)) {
        if (!exclude.has(key) && value !== undefined && value !== null) {
          queryParts.push(`${key}=${encodeURIComponent(String(value))}`);
        }
      }
      if (queryParts.length > 0) finalUrl += '?' + queryParts.join('&');
    }

    try {
      this.logger.log(`📡 Querying patient-booking: GET ${finalUrl}`);
      const response = await axios({ method: 'get', url: finalUrl, headers, timeout: 30000 });
      return { success: true, data: { statusCode: response.status, data: response.data, action } };
    } catch (error: any) {
      this.logger.error('❌ Patient-booking query failed:', error.message);
      return { success: false, error: error.response?.data?.message || error.message, data: { statusCode: error.response?.status, details: error.response?.data } };
    }
  }
}
