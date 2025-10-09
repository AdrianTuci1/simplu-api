import { Injectable, Logger } from '@nestjs/common';
import { ExternalApisService } from '../external-apis.service';
import { ExternalApiConfigService } from './external-api-config.service';
import { ExternalApiConfig } from '../interfaces/external-api-config.interface';
import { BusinessInfoService } from '@/modules/business-info/business-info.service';

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
    private readonly configService: ExternalApiConfigService,
    private readonly businessInfoService: BusinessInfoService
  ) {}

  async sendBookingConfirmation(
    businessId: string,
    appointmentData: AppointmentData,
    locationId?: string
  ): Promise<MessageResult[]> {
    this.logger.log(`Processing booking confirmation for business ${businessId}, location ${locationId}`);
    
    const config = await this.configService.getConfig(businessId, locationId);
    if (!config) {
      this.logger.warn(`No external API config found for business ${businessId}`);
      return [];
    }

    this.logger.log(`Config found - SMS enabled: ${config.sms.enabled}, Email enabled: ${config.email.enabled}`);
    this.logger.log(`SMS sendOnBooking: ${config.sms.sendOnBooking}, Email sendOnBooking: ${config.email.sendOnBooking}`);

    // Enrich appointment data with business info from DynamoDB
    const enrichedData = await this.enrichAppointmentData(businessId, locationId, appointmentData);
    this.logger.log(`Enriched data - Business: ${enrichedData.businessName}, Location: ${enrichedData.locationName}, Address: ${enrichedData.address}`);

    const results: MessageResult[] = [];

    // Send SMS if enabled
    if (config.sms.enabled && config.sms.sendOnBooking && enrichedData.patientPhone) {
      this.logger.log(`Sending SMS to ${enrichedData.patientPhone}`);
      const smsResult = await this.sendSMSMessage(
        businessId,
        enrichedData.patientPhone,
        config.sms,
        enrichedData,
        'booking_confirmation'
      );
      this.logger.log(`SMS result: ${JSON.stringify(smsResult)}`);
      results.push({ ...smsResult, channel: 'sms' });
    } else {
      this.logger.log(`SMS not sent - enabled: ${config.sms.enabled}, sendOnBooking: ${config.sms.sendOnBooking}, hasPhone: ${!!enrichedData.patientPhone}`);
    }

    // Send Email if enabled
    if (config.email.enabled && config.email.sendOnBooking && enrichedData.patientEmail) {
      this.logger.log(`Sending Email to ${enrichedData.patientEmail}`);
      const emailResult = await this.sendEmailMessage(
        businessId,
        enrichedData.patientEmail,
        config.email,
        enrichedData,
        'booking_confirmation',
        locationId
      );
      this.logger.log(`Email result: ${JSON.stringify(emailResult)}`);
      results.push({ ...emailResult, channel: 'email' });
    } else {
      this.logger.log(`Email not sent - enabled: ${config.email.enabled}, sendOnBooking: ${config.email.sendOnBooking}, hasEmail: ${!!enrichedData.patientEmail}`);
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
    const variables: Record<string, string> = {
      patientName: appointmentData.patientName || '',
      appointmentDate: appointmentData.appointmentDate || '',
      appointmentTime: appointmentData.appointmentTime || '',
      businessName: appointmentData.businessName || '',
      locationName: appointmentData.locationName || '',
      serviceName: appointmentData.serviceName || '',
      doctorName: appointmentData.doctorName || '',
      phoneNumber: appointmentData.phoneNumber || '',
      address: appointmentData.address || '',
      // Use pre-generated access code and URL from app server
      accessCode: appointmentData.accessCode || '',
      patientUrl: appointmentData.patientUrl || ''
    };
    
    this.logger.log(`📝 Template variables:`);
    this.logger.log(`   businessName: "${variables.businessName}"`);
    this.logger.log(`   locationName: "${variables.locationName}"`);
    this.logger.log(`   address: "${variables.address}"`);
    this.logger.log(`   accessCode: "${variables.accessCode}"`);
    this.logger.log(`   patientUrl: "${variables.patientUrl}"`);
    
    return variables;
  }

  /**
   * Enrich appointment data with business and location information from DynamoDB
   * Note: accessCode and patientUrl are now generated in app server and passed here
   */
  private async enrichAppointmentData(
    businessId: string,
    locationId: string,
    appointmentData: AppointmentData
  ): Promise<AppointmentData> {
    try {
      this.logger.log(`Enriching appointment data for business ${businessId}, location ${locationId}`);
      
      // Get business info from DynamoDB
      const businessInfo = await this.businessInfoService.getBusinessInfo(businessId);
      
      if (!businessInfo) {
        this.logger.warn(`No business info found for ${businessId}, using original data`);
        return appointmentData;
      }

      this.logger.log(`Found business: ${businessInfo.businessName}`);
      this.logger.log(`Total locations: ${businessInfo.locations.length}`);
      businessInfo.locations.forEach((loc, index) => {
        this.logger.log(`  Location ${index + 1}: ID=${loc.locationId}, Name="${loc.name}", Address="${loc.address}"`);
      });
      this.logger.log(`Looking for locationId: "${locationId}"`);

      // Find the specific location by locationId
      const location = businessInfo.locations.find(loc => loc.locationId === locationId);
      
      if (!location) {
        this.logger.warn(`❌ Location ${locationId} NOT FOUND in available locations`);
        this.logger.warn(`Available locationIds: ${businessInfo.locations.map(l => l.locationId).join(', ')}`);
        return {
          ...appointmentData,
          businessName: businessInfo.businessName,
          locationName: appointmentData.locationName || 'Locație',
          phoneNumber: businessInfo.locations[0]?.phone || appointmentData.phoneNumber,
          domainLabel: businessInfo.domainLabel || appointmentData.domainLabel
        };
      }

      this.logger.log(`✅ Found matching location:`);
      this.logger.log(`   - Location ID: ${location.locationId}`);
      this.logger.log(`   - Location Name: "${location.name}"`);
      this.logger.log(`   - Address: "${location.address}"`);
      this.logger.log(`   - Phone: "${location.phone || 'N/A'}"`);
      
      // Check if location name is empty
      if (!location.name || location.name.trim() === '') {
        this.logger.warn(`⚠️ Location name is EMPTY! Using business name as fallback`);
      }

      // Return enriched data - preserve all original data including pre-generated access code and URL
      const enrichedData = {
        ...appointmentData,
        businessName: businessInfo.businessName,
        locationName: location.name || businessInfo.businessName, // Fallback to businessName if empty
        phoneNumber: location.phone || businessInfo.locations[0]?.phone || appointmentData.phoneNumber,
        address: location.address,
        domainLabel: businessInfo.domainLabel || appointmentData.domainLabel
      };
      
      this.logger.log(`📦 Final enriched data:`);
      this.logger.log(`   - Business Name: "${enrichedData.businessName}"`);
      this.logger.log(`   - Location Name: "${enrichedData.locationName}"`);
      this.logger.log(`   - Phone: "${enrichedData.phoneNumber}"`);
      this.logger.log(`   - Address: "${enrichedData.address}"`);
      this.logger.log(`   - Domain Label: "${enrichedData.domainLabel}"`);
      this.logger.log(`   - Patient ID: "${enrichedData.patientId || 'N/A'}"`);
      this.logger.log(`   - Access Code: "${enrichedData.accessCode || 'N/A'}"`);
      this.logger.log(`   - Patient URL: "${enrichedData.patientUrl || 'N/A'}"`);
      
      return enrichedData;
    } catch (error) {
      this.logger.error(`Failed to enrich appointment data: ${error.message}`);
      return appointmentData; // Return original data if enrichment fails
    }
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
