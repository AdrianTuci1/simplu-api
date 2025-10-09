import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AppointmentData {
  patientName: string;
  patientPhone?: string;
  patientEmail?: string;
  patientId?: string; // Patient ID for URL generation
  appointmentId?: string; // Appointment ID
  appointmentDate: string;
  appointmentTime: string;
  businessName: string;
  locationName?: string;
  serviceName: string;
  doctorName: string;
  phoneNumber?: string;
  address?: string; // Location address
  domainLabel?: string; // Domain label for URL generation
  accessCode?: string; // Pre-generated 6-digit access code (generated in app, sent via ai-agent-server)
  patientUrl?: string; // Pre-generated patient URL (generated in app, sent via ai-agent-server)
}

export interface AutomationStatus {
  smsEnabled: boolean;
  emailEnabled: boolean;
  sendOnBooking: boolean;
  sendReminders: boolean;
}

@Injectable()
export class MessageAutomationService {
  private readonly logger = new Logger(MessageAutomationService.name);
  private readonly aiAgentUrl: string;
  private readonly aiAgentApiKey: string;

  constructor(private configService: ConfigService) {
    this.aiAgentUrl = this.configService.get('AI_AGENT_SERVER_URL') || 'http://localhost:3001';
    this.aiAgentApiKey = this.configService.get('AI_AGENT_API_KEY') || '';
  }

  async sendBookingConfirmation(
    businessId: string,
    appointmentData: AppointmentData,
    locationId?: string
  ): Promise<boolean> {
    try {
      this.logger.log(`Sending booking confirmation for business ${businessId}, location ${locationId}`);

      const response = await fetch(
        `${this.aiAgentUrl}/message-automation/${businessId}/send-booking-confirmation?locationId=${locationId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.aiAgentApiKey}`
          },
          body: JSON.stringify(appointmentData)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      this.logger.log(`Booking confirmation sent successfully: ${JSON.stringify(result)}`);
      
      return result.every((msg: any) => msg.success);
    } catch (error) {
      this.logger.error(`Failed to send booking confirmation: ${error.message}`);
      return false;
    }
  }

  async sendReminderMessage(
    businessId: string,
    appointmentData: AppointmentData,
    reminderType: 'day_before' | 'same_day',
    locationId?: string
  ): Promise<boolean> {
    try {
      this.logger.log(`Sending ${reminderType} reminder for business ${businessId}`);

      const response = await fetch(
        `${this.aiAgentUrl}/message-automation/${businessId}/send-reminder?locationId=${locationId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.aiAgentApiKey}`
          },
          body: JSON.stringify({
            appointmentData,
            reminderType
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      this.logger.log(`Reminder sent successfully: ${JSON.stringify(result)}`);
      
      return result.every((msg: any) => msg.success);
    } catch (error) {
      this.logger.error(`Failed to send reminder: ${error.message}`);
      return false;
    }
  }

  async checkAutomationStatus(
    businessId: string,
    locationId?: string
  ): Promise<AutomationStatus> {
    try {
      const response = await fetch(
        `${this.aiAgentUrl}/message-automation/${businessId}/automation-status?locationId=${locationId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.aiAgentApiKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to check automation status: ${error.message}`);
      return {
        smsEnabled: false,
        emailEnabled: false,
        sendOnBooking: false,
        sendReminders: false
      };
    }
  }
}
