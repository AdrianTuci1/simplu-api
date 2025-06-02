import { Injectable } from '@nestjs/common';
import { TwilioService } from '../twilio/twilio.service';
import { CommunicationConfigService } from '../services/communication-config.service';

export enum TenantType {
  HOTEL = 'hotel',
  CLINIC = 'clinic'
}

@Injectable()
export class SMSNotificationService {
  constructor(
    private twilioService: TwilioService,
    private communicationConfigService: CommunicationConfigService,
  ) {}

  private getHotelTemplates() {
    return {
      bookingConfirmation: (data: any) => 
        `Your booking for ${data.roomType} has been confirmed. Check-in: ${data.checkIn}, Check-out: ${data.checkOut}`,
      
      bookingCancellation: (data: any) =>
        `Your booking for ${data.roomType} from ${data.checkIn} to ${data.checkOut} has been cancelled.`,
      
      paymentConfirmation: (data: any) =>
        `Payment of ${data.amount} has been confirmed for your hotel stay. Transaction ID: ${data.transactionId}`,
      
      checkInReminder: (data: any) =>
        `Reminder: Your hotel check-in is scheduled for ${data.checkIn}. We look forward to welcoming you!`
    };
  }

  private getClinicTemplates() {
    return {
      bookingConfirmation: (data: any) =>
        `Your appointment with Dr. ${data.doctorName} has been confirmed for ${data.appointmentDate} at ${data.appointmentTime}.`,
      
      bookingCancellation: (data: any) =>
        `Your appointment with Dr. ${data.doctorName} scheduled for ${data.appointmentDate} at ${data.appointmentTime} has been cancelled.`,
      
      paymentConfirmation: (data: any) =>
        `Payment of ${data.amount} has been confirmed for your medical consultation. Transaction ID: ${data.transactionId}`,
      
      checkInReminder: (data: any) =>
        `Reminder: Your medical appointment is scheduled for ${data.appointmentDate} at ${data.appointmentTime}. Please arrive 10 minutes early.`
    };
  }

  private async getTenantType(tenantId: string): Promise<TenantType> {
    const config = await this.communicationConfigService.getConfig(tenantId);
    return config.tenantType || TenantType.HOTEL; // Default to hotel if not specified
  }

  private async getTemplates(tenantId: string) {
    const tenantType = await this.getTenantType(tenantId);
    return tenantType === TenantType.HOTEL ? this.getHotelTemplates() : this.getClinicTemplates();
  }

  async sendBookingConfirmation(tenantId: string, bookingData: {
    customerPhone: string;
    bookingId: string;
    checkIn: Date;
    checkOut: Date;
    roomType: string;
  }) {
    const config = await this.communicationConfigService.getConfig(tenantId);
    const message = `Your booking #${bookingData.bookingId} has been confirmed. Check-in: ${bookingData.checkIn}, Check-out: ${bookingData.checkOut}, Room: ${bookingData.roomType}`;
    return this.twilioService.sendSMS(tenantId, bookingData.customerPhone, message, config);
  }

  async sendBookingCancellation(tenantId: string, bookingData: {
    customerPhone: string;
    roomType?: string;
    checkIn?: Date;
    checkOut?: Date;
    doctorName?: string;
    appointmentDate?: Date;
    appointmentTime?: string;
  }) {
    const config = await this.communicationConfigService.getConfig(tenantId);
    const templates = await this.getTemplates(tenantId);
    const message = templates.bookingCancellation(bookingData);
    return this.twilioService.sendSMS(tenantId, bookingData.customerPhone, message, config);
  }

  async sendPaymentConfirmation(tenantId: string, paymentData: {
    customerPhone: string;
    amount: number;
    transactionId: string;
  }) {
    const config = await this.communicationConfigService.getConfig(tenantId);
    const message = `Payment of $${paymentData.amount} has been confirmed. Transaction ID: ${paymentData.transactionId}`;
    return this.twilioService.sendSMS(tenantId, paymentData.customerPhone, message, config);
  }

  async sendCheckInReminder(tenantId: string, bookingData: {
    customerPhone: string;
    checkIn?: Date;
    appointmentDate?: Date;
    appointmentTime?: string;
  }) {
    const config = await this.communicationConfigService.getConfig(tenantId);
    const templates = await this.getTemplates(tenantId);
    const message = templates.checkInReminder(bookingData);
    return this.twilioService.sendSMS(tenantId, bookingData.customerPhone, message, config);
  }
} 