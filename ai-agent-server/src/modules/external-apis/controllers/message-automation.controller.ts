import { 
  Controller, 
  Post, 
  Get,
  Body, 
  Param, 
  Query,
  Logger,
} from '@nestjs/common';
import { MessageAutomationService, AppointmentData } from '../services/message-automation.service';

@Controller('message-automation')
export class MessageAutomationController {
  private readonly logger = new Logger(MessageAutomationController.name);

  constructor(
    private readonly messageAutomationService: MessageAutomationService
  ) {}

  @Post(':businessId/send-booking-confirmation')
  async sendBookingConfirmation(
    @Param('businessId') businessId: string,
    @Body() appointmentData: AppointmentData,
    @Query('locationId') locationId?: string
  ) {
    this.logger.log(`=== Received booking confirmation request ===`);
    this.logger.log(`Business ID: ${businessId}`);
    this.logger.log(`Location ID: ${locationId}`);
    this.logger.log(`Patient: ${appointmentData.patientName}`);
    this.logger.log(`Date: ${appointmentData.appointmentDate} ${appointmentData.appointmentTime}`);
    
    const results = await this.messageAutomationService.sendBookingConfirmation(
      businessId,
      appointmentData,
      locationId
    );
    
    this.logger.log(`=== Booking confirmation sent: ${results.length} message(s) ===`);
    results.forEach((result, index) => {
      this.logger.log(`Message ${index + 1} [${result.channel}]: ${result.success ? 'SUCCESS' : 'FAILED'} ${result.messageId || result.error || ''}`);
    });
    
    return results;
  }

  @Post(':businessId/send-reminder')
  async sendReminderMessage(
    @Param('businessId') businessId: string,
    @Body() body: { 
      appointmentData: AppointmentData;
      reminderType: 'day_before' | 'same_day';
    },
    @Query('locationId') locationId?: string
  ) {
    return await this.messageAutomationService.sendReminderMessage(
      businessId,
      body.appointmentData,
      body.reminderType,
      locationId
    );
  }

  @Get(':businessId/automation-status')
  async getAutomationStatus(
    @Param('businessId') businessId: string,
    @Query('locationId') locationId?: string
  ) {
    return await this.messageAutomationService.isAutomationEnabled(businessId, locationId);
  }
}
