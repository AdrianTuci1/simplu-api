import { Injectable, Logger } from '@nestjs/common';
import { ExternalApisService } from '../external-apis.service';
import { ExternalApiConfigService } from './external-api-config.service';
import { ExternalApiConfig } from '../interfaces/external-api-config.interface';

export interface AppointmentData {
  patientName: string;
  patientPhone?: string;
  patientEmail?: string;
  appointmentDate: string;
  appointmentTime: string;
  businessName: string;
  locationName?: string;
  serviceName: string;
  doctorName: string;
  phoneNumber?: string;
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  channel: 'sms' | 'email' | 'meta';
}

@Injectable()
export class MessageAutomationService {
  private readonly logger = new Logger(MessageAutomationService.name);

  constructor(
    private readonly externalApisService: ExternalApisService,
    private readonly configService: ExternalApiConfigService
  ) {}

  async sendBookingConfirmation(
    businessId: string,
    appointmentData: AppointmentData,
    locationId?: string
  ): Promise<MessageResult[]> {
    const config = await this.configService.getConfig(businessId, locationId);
    if (!config) {
      this.logger.warn(`No external API config found for business ${businessId}`);
      return [];
    }

    const results: MessageResult[] = [];

    // Send SMS if enabled
    if (config.sms.enabled && config.sms.sendOnBooking && appointmentData.patientPhone) {
      const smsResult = await this.sendSMSMessage(
        businessId,
        appointmentData.patientPhone,
        config.sms,
        appointmentData,
        'booking_confirmation'
      );
      results.push({ ...smsResult, channel: 'sms' });
    }

    // Send Email if enabled
    if (config.email.enabled && config.email.sendOnBooking && appointmentData.patientEmail) {
      const emailResult = await this.sendEmailMessage(
        businessId,
        appointmentData.patientEmail,
        config.email,
        appointmentData,
        'booking_confirmation',
        locationId
      );
      results.push({ ...emailResult, channel: 'email' });
    }

    return results;
  }

  async sendReminderMessage(
    businessId: string,
    appointmentData: AppointmentData,
    reminderType: 'day_before' | 'same_day',
    locationId?: string
  ): Promise<MessageResult[]> {
    const config = await this.configService.getConfig(businessId, locationId);
    if (!config) {
      this.logger.warn(`No external API config found for business ${businessId}`);
      return [];
    }

    const results: MessageResult[] = [];

    // Check if reminder should be sent based on timing configuration
    const shouldSendSMSReminder = config.sms.enabled && 
      config.sms.sendReminder && 
      (config.sms.reminderTiming === reminderType || config.sms.reminderTiming === 'both');

    const shouldSendEmailReminder = config.email.enabled && 
      config.email.sendReminder && 
      (config.email.reminderTiming === reminderType || config.email.reminderTiming === 'both');

    // Send SMS reminder if enabled
    if (shouldSendSMSReminder && appointmentData.patientPhone) {
      const smsResult = await this.sendSMSMessage(
        businessId,
        appointmentData.patientPhone,
        config.sms,
        appointmentData,
        'reminder'
      );
      results.push({ ...smsResult, channel: 'sms' });
    }

    // Send Email reminder if enabled
    if (shouldSendEmailReminder && appointmentData.patientEmail) {
      const emailResult = await this.sendEmailMessage(
        businessId,
        appointmentData.patientEmail,
        config.email,
        appointmentData,
        'reminder',
        locationId
      );
      results.push({ ...emailResult, channel: 'email' });
    }

    return results;
  }

  private async sendSMSMessage(
    businessId: string,
    phoneNumber: string,
    smsConfig: any,
    appointmentData: AppointmentData,
    messageType: 'booking_confirmation' | 'reminder'
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Get the template
      const template = smsConfig.templates.find(t => t.id === smsConfig.defaultTemplate);
      if (!template) {
        return { success: false, error: 'No SMS template found' };
      }

      // Process template variables
      const variables = this.buildTemplateVariables(appointmentData);
      const message = this.configService.processTemplate(template.content, variables);

      // Send SMS based on service type
      switch (smsConfig.serviceType) {
        case 'aws_sns':
        case 'twilio':
          return await this.externalApisService.sendSMS(phoneNumber, message, businessId);
        case 'meta':
          return await this.externalApisService.sendMetaMessage(phoneNumber, message, businessId);
        default:
          return { success: false, error: 'Unsupported SMS service type' };
      }
    } catch (error) {
      this.logger.error(`Failed to send SMS message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private async sendEmailMessage(
    businessId: string,
    emailAddress: string,
    emailConfig: any,
    appointmentData: AppointmentData,
    messageType: 'booking_confirmation' | 'reminder',
    locationId?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Get the template
      const template = emailConfig.templates.find(t => t.id === emailConfig.defaultTemplate);
      if (!template) {
        return { success: false, error: 'No email template found' };
      }

      // Process template variables
      const variables = this.buildTemplateVariables(appointmentData);
      const subject = this.configService.processTemplate(template.subject, variables);
      const content = this.configService.processTemplate(template.content, variables);

      // Send email based on service type
      switch (emailConfig.serviceType) {
        case 'gmail':
          // For Gmail, we need a locationId - using the locationId from config
          if (!locationId) {
            return { success: false, error: 'LocationId is required for Gmail authentication' };
          }
          return await this.externalApisService.sendEmailFromGmail(
            businessId,
            locationId,
            emailAddress,
            subject,
            content
          );
        case 'smtp':
          // For SMTP, you might need to implement a different method
          return await this.externalApisService.sendEmail(emailAddress, subject, content, businessId);
        default:
          return { success: false, error: 'Unsupported email service type' };
      }
    } catch (error) {
      this.logger.error(`Failed to send email message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private buildTemplateVariables(appointmentData: AppointmentData): Record<string, string> {
    return {
      patientName: appointmentData.patientName || '',
      appointmentDate: appointmentData.appointmentDate || '',
      appointmentTime: appointmentData.appointmentTime || '',
      businessName: appointmentData.businessName || '',
      locationName: appointmentData.locationName || '',
      serviceName: appointmentData.serviceName || '',
      doctorName: appointmentData.doctorName || '',
      phoneNumber: appointmentData.phoneNumber || ''
    };
  }

  // Utility method to check if automation is enabled for a business
  async isAutomationEnabled(businessId: string, locationId?: string): Promise<{
    smsEnabled: boolean;
    emailEnabled: boolean;
    sendOnBooking: boolean;
    sendReminders: boolean;
  }> {
    const config = await this.configService.getConfig(businessId, locationId);
    if (!config) {
      return {
        smsEnabled: false,
        emailEnabled: false,
        sendOnBooking: false,
        sendReminders: false
      };
    }

    return {
      smsEnabled: config.sms.enabled,
      emailEnabled: config.email.enabled,
      sendOnBooking: config.sms.sendOnBooking || config.email.sendOnBooking,
      sendReminders: config.sms.sendReminder || config.email.sendReminder
    };
  }
}
