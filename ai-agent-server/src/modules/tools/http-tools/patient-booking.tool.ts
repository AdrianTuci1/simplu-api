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
      description: `Patient booking operations via /api/patient-booking.
Actions: 
- available-dates-with-slots (from, to, optional: serviceId, medicId) - Get available dates with time slots
- reserve (date, time, serviceId, customer{name, phone, email}, optional: medicId, duration) - Create appointment booking
- cancel-appointment (appointmentId, patientId, accessCode) - Cancel patient appointment
Note: For services/treatments list, use query_resources with resourceType: "treatment".`,
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            businessId: { type: 'string' },
            locationId: { type: 'string' },
            action: { type: 'string', enum: ['available-dates-with-slots', 'reserve', 'cancel-appointment'] },
            params: { type: 'object' },
          },
          required: ['businessId', 'locationId', 'action', 'params'],
        },
      },
    };
  }

  async execute(input: ToolInput): Promise<ToolResult> {
    const { parameters, context } = input;
    this.logger.log(`📋 PatientBookingQueryTool received parameters: ${JSON.stringify(parameters, null, 2)}`);

    const { businessId, locationId, action, params } = parameters as any;

    const safeParams: Record<string, unknown> = typeof params === 'object' && params !== null ? (params as Record<string, unknown>) : {};

    let url: string = '';
    let method: 'get' | 'post' = 'get';
    let body: any = null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    switch (action) {
      case 'available-dates-with-slots': {
        // GET /api/patient-booking/available-dates-with-slots/:businessId-:locationId?from=X&to=Y&serviceId=Z&medicId=W
        const { from, to, serviceId, medicId } = safeParams;
        if (!from || !to) {
          return { success: false, error: 'from and to dates are required (YYYY-MM-DD)' };
        }
        url = `${this.appServerUrl}/api/patient-booking/available-dates-with-slots/${businessId}-${locationId}`;
        const queryParts: string[] = [
          `from=${encodeURIComponent(String(from))}`,
          `to=${encodeURIComponent(String(to))}`,
        ];
        if (serviceId) queryParts.push(`serviceId=${encodeURIComponent(String(serviceId))}`);
        if (medicId) queryParts.push(`medicId=${encodeURIComponent(String(medicId))}`);
        url += '?' + queryParts.join('&');
        method = 'get';
        break;
      }

      case 'reserve': {
        // POST /api/patient-booking/reserve/:businessId-:locationId
        const { date, time, serviceId, duration, medicId, customer } = safeParams;
        if (!date || !time || !serviceId || !customer) {
          return { success: false, error: 'date, time, serviceId, and customer are required for reserve' };
        }
        url = `${this.appServerUrl}/api/patient-booking/reserve/${businessId}-${locationId}`;
        method = 'post';
        body = {
          date,
          time,
          serviceId,
          duration,
          medicId,
          customer,
        };
        break;
      }

      case 'cancel-appointment': {
        // POST /api/patient-booking/cancel-appointment/:businessId-:locationId/:appointmentId
        const { appointmentId, patientId, accessCode } = safeParams;
        if (!appointmentId || !patientId || !accessCode) {
          return { success: false, error: 'appointmentId, patientId, and accessCode are required for cancel-appointment' };
        }
        url = `${this.appServerUrl}/api/patient-booking/cancel-appointment/${businessId}-${locationId}/${appointmentId}`;
        method = 'post';
        body = {
          patientId,
          accessCode,
        };
        break;
      }

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }

    try {
      this.logger.log(`📡 Patient-booking ${method.toUpperCase()}: ${url}${body ? ' with body: ' + JSON.stringify(body) : ''}`);
      const response = await axios({ method, url, headers, data: body, timeout: 30000 });
      return { success: true, data: { statusCode: response.status, data: response.data, action } };
    } catch (error: any) {
      this.logger.error('❌ Patient-booking operation failed:', error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message, 
        data: { statusCode: error.response?.status, details: error.response?.data } 
      };
    }
  }
}
