import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TwilioService } from '../twilio/twilio.service';
import { EmailTemplatesService } from '../email/email-templates.service';
import { WhatsAppConversationService } from '../whatsapp/whatsapp-conversation.service';
import { BookingIntegrationService } from './booking-integration.service';
import { SMSNotificationService } from '../sms/sms-notification.service';
import { CommunicationConfigService } from '../services/communication-config.service';

@Injectable()
export class BookingService {
  constructor(
    private configService: ConfigService,
    private twilioService: TwilioService,
    private emailTemplatesService: EmailTemplatesService,
    private whatsAppConversationService: WhatsAppConversationService,
    private bookingIntegrationService: BookingIntegrationService,
    private smsNotificationService: SMSNotificationService,
    private communicationConfigService: CommunicationConfigService,
  ) {}

  async createBooking(tenantId: string, bookingData: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    checkIn: Date;
    checkOut: Date;
    roomType: string;
    numberOfGuests: number;
    source?: 'whatsapp' | 'email' | 'booking.com';
  }) {
    try {
      // Here you would typically save the booking to your database
      // For now, we'll just send confirmations

      // Get communication config
      const config = await this.communicationConfigService.getConfig(tenantId);

      // Send email confirmation
      await this.emailTemplatesService.sendBookingConfirmation(tenantId, bookingData);

      // Send WhatsApp confirmation
      await this.twilioService.sendWhatsAppMessage(
        tenantId,
        bookingData.customerPhone,
        `Your booking for ${bookingData.roomType} has been confirmed. Check-in: ${bookingData.checkIn}, Check-out: ${bookingData.checkOut}`,
        config
      );

      return {
        success: true,
        message: 'Booking created and confirmations sent',
        tenantId,
      };
    } catch (error) {
      throw new Error(`Failed to create booking: ${error.message}`);
    }
  }

  async handleIncomingBookingRequest(tenantId: string, request: any) {
    try {
      const bookingData = this.parseBookingRequest(request);
      return this.createBooking(tenantId, bookingData);
    } catch (error) {
      throw new Error(`Failed to process booking request: ${error.message}`);
    }
  }

  async handleBookingComWebhook(tenantId: string, webhookData: any) {
    try {
      // Verify webhook signature
      const config = await this.getBookingConfig(tenantId);
      if (!this.verifyWebhookSignature(webhookData, config.webhookSecret)) {
        throw new Error('Invalid webhook signature');
      }

      // Process the webhook data
      const bookingData = this.parseBookingComData(webhookData);
      return this.createBooking(tenantId, {
        ...bookingData,
        source: 'booking.com',
      });
    } catch (error) {
      throw new Error(`Failed to process Booking.com webhook: ${error.message}`);
    }
  }

  async handleWhatsAppBooking(tenantId: string, phoneNumber: string, message: string) {
    try {
      // Process the message through the conversation service
      const result = await this.whatsAppConversationService.handleMessage(
        tenantId,
        phoneNumber,
        message,
      );

      // If the conversation indicates a booking intent, create the booking
      if (result.intent === 'booking') {
        const bookingData = this.parseWhatsAppBookingData(result);
        return this.createBooking(tenantId, {
          ...bookingData,
          source: 'whatsapp',
        });
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to process WhatsApp booking: ${error.message}`);
    }
  }

  async handleEmailBooking(tenantId: string, emailData: any) {
    try {
      const bookingData = this.parseEmailBookingData(emailData);
      return this.createBooking(tenantId, {
        ...bookingData,
        source: 'email',
      });
    } catch (error) {
      throw new Error(`Failed to process email booking: ${error.message}`);
    }
  }

  private parseBookingRequest(request: any) {
    return {
      customerName: request.name,
      customerEmail: request.email,
      customerPhone: request.phone,
      checkIn: new Date(request.checkIn),
      checkOut: new Date(request.checkOut),
      roomType: request.roomType,
      numberOfGuests: request.guests,
    };
  }

  private parseBookingComData(data: any) {
    return {
      customerName: data.guest_name,
      customerEmail: data.guest_email,
      customerPhone: data.guest_phone,
      checkIn: new Date(data.check_in),
      checkOut: new Date(data.check_out),
      roomType: data.room_type,
      numberOfGuests: data.guests,
    };
  }

  private parseWhatsAppBookingData(data: any) {
    return {
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      checkIn: new Date(data.checkIn),
      checkOut: new Date(data.checkOut),
      roomType: data.roomType,
      numberOfGuests: data.numberOfGuests,
    };
  }

  private parseEmailBookingData(data: any) {
    return {
      customerName: data.from.name,
      customerEmail: data.from.address,
      customerPhone: data.phone,
      checkIn: new Date(data.checkIn),
      checkOut: new Date(data.checkOut),
      roomType: data.roomType,
      numberOfGuests: data.guests,
    };
  }

  private verifyWebhookSignature(data: any, secret: string): boolean {
    // Implement webhook signature verification
    return true; // Placeholder
  }

  private async getBookingConfig(tenantId: string) {
    // This would typically come from your tenant configuration
    return {
      webhookSecret: this.configService.get(`BOOKING_WEBHOOK_SECRET_${tenantId}`),
    };
  }
} 