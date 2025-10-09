import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BusinessInfoService } from '@/modules/business-info/business-info.service';
import { ExternalApiConfigService } from '@/modules/external-apis/services/external-api-config.service';
import { MessageAutomationService, AppointmentData } from '@/modules/external-apis/services/message-automation.service';
import axios from 'axios';

interface AppointmentResource {
  id: string;
  resourceType: string;
  businessLocationId: string;
  startDate: string;
  endDate: string;
  data: {
    patientName?: string;
    patientPhone?: string;
    patientEmail?: string;
    patientId?: string;
    time?: string;
    startTime?: string;
    endTime?: string;
    serviceName?: string;
    service?: {
      id: string;
      name: string;
    };
    doctorName?: string;
    doctor?: {
      id: string;
      name: string;
    };
    status?: string;
    [key: string]: any;
  };
}

@Injectable()
export class AppointmentRemindersJob {
  private readonly logger = new Logger(AppointmentRemindersJob.name);
  private readonly appServerUrl: string;
  private readonly aiServerKey: string;

  constructor(
    private readonly businessInfoService: BusinessInfoService,
    private readonly configService: ExternalApiConfigService,
    private readonly messageAutomationService: MessageAutomationService,
  ) {
    this.appServerUrl = process.env.APP_SERVER_URL || 'http://localhost:3001';
    this.aiServerKey = process.env.AI_SERVER_KEY || '';
    
    if (!this.aiServerKey) {
      this.logger.warn('AI_SERVER_KEY not configured - appointment reminders may fail to authenticate');
    }
  }

  /**
   * Cron job that runs every hour to check and send appointment reminders
   * Runs at the top of every hour (00 minutes)
   */
  @Cron('0 * * * *') // Runs every hour at :00
  async handleAppointmentReminders() {
    this.logger.log('🔔 Starting appointment reminders check...');

    try {
      // Get all businesses with enabled automation
      const businesses = await this.getAllBusinessesWithAutomation();
      this.logger.log(`Found ${businesses.length} businesses with automation enabled`);

      for (const business of businesses) {
        try {
          await this.processBusinessReminders(business);
        } catch (error) {
          this.logger.error(
            `Error processing reminders for business ${business.businessId}: ${error.message}`,
          );
        }
      }

      this.logger.log('✅ Appointment reminders check completed');
    } catch (error) {
      this.logger.error(`Error in appointment reminders job: ${error.message}`);
    }
  }

  /**
   * Get all businesses with automation (reminders) enabled from DynamoDB
   */
  private async getAllBusinessesWithAutomation(): Promise<Array<{ businessId: string; locationId: string }>> {
    try {
      // Scan all ExternalApiConfig records to find businesses with reminders enabled
      const allConfigs = await this.configService.getAllConfigs();
      
      // Filter to only include businesses with reminders enabled
      const businessesWithReminders = allConfigs.filter(config => {
        const smsRemindersEnabled = config.sms?.enabled && config.sms?.sendReminder;
        const emailRemindersEnabled = config.email?.enabled && config.email?.sendReminder;
        return smsRemindersEnabled || emailRemindersEnabled;
      });

      this.logger.log(`Found ${businessesWithReminders.length} businesses/locations with reminders enabled`);

      return businessesWithReminders.map(config => ({
        businessId: config.businessId,
        locationId: config.locationId || 'default',
      }));
    } catch (error) {
      this.logger.error(`Error getting businesses with automation: ${error.message}`);
      return [];
    }
  }

  /**
   * Process reminders for a specific business/location
   */
  private async processBusinessReminders(business: { businessId: string; locationId: string }) {
    this.logger.log(`Processing reminders for business ${business.businessId}, location ${business.locationId}`);

    // Get automation config
    const config = await this.configService.getConfig(business.businessId, business.locationId);
    if (!config) {
      this.logger.log(`No automation config found for ${business.businessId}/${business.locationId}`);
      return;
    }

    // Check if reminders are enabled for either SMS or Email
    const smsReminderEnabled = config.sms.enabled && config.sms.sendReminder;
    const emailReminderEnabled = config.email.enabled && config.email.sendReminder;

    if (!smsReminderEnabled && !emailReminderEnabled) {
      this.logger.log(`Reminders not enabled for ${business.businessId}/${business.locationId}`);
      return;
    }

    this.logger.log(`Reminder config - SMS: ${smsReminderEnabled} (timing: ${config.sms.reminderTiming}), Email: ${emailReminderEnabled} (timing: ${config.email.reminderTiming})`);

    // Get business info for scheduling
    const businessInfo = await this.businessInfoService.getBusinessInfo(business.businessId);
    if (!businessInfo) {
      this.logger.warn(`Business info not found for ${business.businessId}`);
      return;
    }

    // Determine which dates to check based on reminder timing
    const datesToCheck = this.getDatesByReminderTiming(config, businessInfo);
    this.logger.log(`Checking appointments for dates: ${datesToCheck.join(', ')}`);

    // Get appointments for each date
    for (const date of datesToCheck) {
      const appointments = await this.getAppointmentsForDate(
        business.businessId,
        business.locationId,
        date,
      );

      this.logger.log(`Found ${appointments.length} appointments for ${date}`);

      // Send reminders for each appointment
      for (const appointment of appointments) {
        try {
          await this.sendReminderForAppointment(
            business.businessId,
            business.locationId,
            businessInfo,
            appointment,
            date,
          );
        } catch (error) {
          this.logger.error(
            `Error sending reminder for appointment ${appointment.id}: ${error.message}`,
          );
        }
      }
    }
  }

  /**
   * Determine which dates to check based on reminder timing configuration
   */
  private getDatesByReminderTiming(config: any, businessInfo: any): string[] {
    const now = new Date();
    const today = this.formatDate(now);
    const tomorrow = this.formatDate(new Date(now.getTime() + 24 * 60 * 60 * 1000));

    const dates = new Set<string>();

    // Check SMS reminder timing
    if (config.sms.enabled && config.sms.sendReminder) {
      if (config.sms.reminderTiming === 'day_before' || config.sms.reminderTiming === 'both') {
        dates.add(tomorrow);
      }
      if (config.sms.reminderTiming === 'same_day' || config.sms.reminderTiming === 'both') {
        dates.add(today);
      }
    }

    // Check Email reminder timing
    if (config.email.enabled && config.email.sendReminder) {
      if (config.email.reminderTiming === 'day_before' || config.email.reminderTiming === 'both') {
        dates.add(tomorrow);
      }
      if (config.email.reminderTiming === 'same_day' || config.email.reminderTiming === 'both') {
        dates.add(today);
      }
    }

    return Array.from(dates);
  }

  /**
   * Get appointments for a specific date from app server
   */
  private async getAppointmentsForDate(
    businessId: string,
    locationId: string,
    date: string,
  ): Promise<AppointmentResource[]> {
    try {
      const businessLocationId = `${businessId}-${locationId}`;
      
      // Query app server for appointments on the specific date
      const response = await axios.get(
        `${this.appServerUrl}/api/resources/${businessLocationId}/appointments`,
        {
          params: {
            startDate: date,
            endDate: date,
            limit: 100,
          },
          headers: {
            'AI-SERVER-KEY': this.aiServerKey,
          },
          timeout: 10000,
        },
      );

      if (response.status === 200 && response.data.resources) {
        // Filter to only get appointments with active status (not cancelled or completed)
        return response.data.resources.filter((apt: AppointmentResource) => {
          const status = apt.data.status?.toLowerCase();
          return !status || !['cancelled', 'canceled', 'completed', 'absent'].includes(status);
        });
      }

      return [];
    } catch (error) {
      if (error.response?.status === 404) {
        // No appointments found
        return [];
      }
      this.logger.error(
        `Error fetching appointments for ${businessId}/${locationId} on ${date}: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Send reminder for a specific appointment
   */
  private async sendReminderForAppointment(
    businessId: string,
    locationId: string,
    businessInfo: any,
    appointment: AppointmentResource,
    appointmentDate: string,
  ) {
    // Extract patient contact info
    const patientName = appointment.data.patientName || 'Pacient';
    const patientPhone = appointment.data.patientPhone;
    const patientEmail = appointment.data.patientEmail;
    const patientId = appointment.data.patientId;

    // Skip if no contact info
    if (!patientPhone && !patientEmail) {
      this.logger.log(`Skipping appointment ${appointment.id} - no contact info`);
      return;
    }

    // Extract appointment details
    const time = appointment.data.time || appointment.data.startTime || '00:00';
    const serviceName = appointment.data.serviceName || 
                       appointment.data.service?.name || 
                       'Serviciu';
    const doctorName = appointment.data.doctorName || 
                      appointment.data.doctor?.name || 
                      'Doctor';

    // Find location info
    const location = businessInfo.locations.find(
      (loc: any) => loc.locationId === locationId,
    );

    const appointmentData: AppointmentData = {
      patientName,
      patientPhone,
      patientEmail,
      patientId,
      appointmentId: appointment.id,
      appointmentDate: this.formatDateForDisplay(appointmentDate),
      appointmentTime: time,
      businessName: businessInfo.businessName,
      locationName: location?.name || businessInfo.businessName,
      serviceName,
      doctorName,
      phoneNumber: location?.phone,
      address: location?.address,
      domainLabel: businessInfo.domainLabel,
    };

    this.logger.log(
      `Sending reminder for appointment ${appointment.id} to ${patientName} (${patientPhone || patientEmail})`,
    );

    // Send reminder using message automation service
    const results = await this.messageAutomationService.sendReminderMessage(
      businessId,
      appointmentData,
      this.getReminderType(appointmentDate),
      locationId,
    );

    // Log results
    results.forEach((result) => {
      if (result.success) {
        this.logger.log(
          `✅ Reminder sent via ${result.channel} for appointment ${appointment.id} - MessageId: ${result.messageId}`,
        );
      } else {
        this.logger.error(
          `❌ Failed to send reminder via ${result.channel} for appointment ${appointment.id}: ${result.error}`,
        );
      }
    });
  }

  /**
   * Determine reminder type based on appointment date
   */
  private getReminderType(appointmentDate: string): 'day_before' | 'same_day' {
    const today = this.formatDate(new Date());
    return appointmentDate === today ? 'same_day' : 'day_before';
  }

  /**
   * Format date to YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Format date for display (e.g., "15 ianuarie 2024")
   */
  private formatDateForDisplay(dateStr: string): string {
    const months = [
      'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
      'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
    ];

    const date = new Date(dateStr);
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  }

  /**
   * Manual trigger for testing (can be called via controller)
   */
  async triggerManual(businessId?: string, locationId?: string) {
    this.logger.log('🔔 Manual trigger for appointment reminders');

    if (businessId && locationId) {
      // Test specific business/location
      await this.processBusinessReminders({ businessId, locationId });
    } else {
      // Run full job
      await this.handleAppointmentReminders();
    }

    return { success: true, message: 'Appointment reminders processed' };
  }
}

