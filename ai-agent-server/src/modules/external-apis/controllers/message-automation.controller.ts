import { 
  Controller, 
  Post, 
  Get,
  Body, 
  Param, 
  Query, 
} from '@nestjs/common';
import { MessageAutomationService, AppointmentData } from '../services/message-automation.service';

@Controller('message-automation')
export class MessageAutomationController {
  constructor(
    private readonly messageAutomationService: MessageAutomationService
  ) {}

  @Post(':businessId/send-booking-confirmation')
  async sendBookingConfirmation(
    @Param('businessId') businessId: string,
    @Body() appointmentData: AppointmentData,
    @Query('locationId') locationId?: string
  ) {
    return await this.messageAutomationService.sendBookingConfirmation(
      businessId,
      appointmentData,
      locationId
    );
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
