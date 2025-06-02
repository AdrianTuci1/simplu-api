import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessConfigService } from './business-config.service';
import { TwilioService } from '../twilio/twilio.service';
import { EmailService } from '../email/email.service';
import { BookingIntegrationService } from '../booking/booking-integration.service';
import { WhatsAppConversationService } from '../whatsapp/whatsapp-conversation.service';
import { SMSNotificationService } from '../sms/sms-notification.service';
import { KafkaService } from '../kafka/kafka.service';
import { BusinessFeatures } from '../entities/business-config.entity';
import { CommunicationConfigService } from './communication-config.service';

type CommunicationChannel = 'whatsapp' | 'sms' | 'email';

@Injectable()
export class CommunicationAgentService {
  constructor(
    private configService: ConfigService,
    private businessConfigService: BusinessConfigService,
    private twilioService: TwilioService,
    private emailService: EmailService,
    private bookingIntegrationService: BookingIntegrationService,
    private whatsAppConversationService: WhatsAppConversationService,
    private smsNotificationService: SMSNotificationService,
    private kafkaService: KafkaService,
    private communicationConfigService: CommunicationConfigService,
  ) {}

  async handleIncomingMessage(businessId: string, channel: CommunicationChannel, message: any) {
    // Check if the channel is enabled for this business
    const isEnabled = await this.businessConfigService.isFeatureEnabled(businessId, channel as keyof BusinessFeatures);
    if (!isEnabled) {
      throw new Error(`Channel ${channel} is not enabled for business ${businessId}`);
    }

    // Process message based on channel
    let response;
    switch (channel) {
      case 'whatsapp':
        response = await this.whatsAppConversationService.handleMessage(
          businessId,
          message.from,
          message.body
        );
        break;
      case 'email':
        response = await this.emailService.readEmails(businessId);
        break;
      case 'sms':
        response = await this.processSMS(businessId, message);
        break;
    }

    // Publish action to Kafka
    await this.kafkaService.publish('agent', {
      businessId,
      channel,
      action: 'message_processed',
      data: {
        incoming: message,
        response
      }
    });

    return response;
  }

  async handleBookingRequest(businessId: string, source: 'whatsapp' | 'email' | 'booking.com', data: any) {
    // Check if booking is enabled for this business
    const isBookingEnabled = await this.businessConfigService.isFeatureEnabled(businessId, 'booking');
    if (!isBookingEnabled) {
      throw new Error(`Booking is not enabled for business ${businessId}`);
    }

    // Process booking based on source
    let bookingResult;
    switch (source) {
      case 'whatsapp':
        bookingResult = await this.whatsAppConversationService.handleMessage(businessId, data.from, data.body);
        break;
      case 'email':
        bookingResult = await this.emailService.readEmails(businessId);
        break;
      case 'booking.com':
        bookingResult = await this.bookingIntegrationService.fetchBookings(businessId, new Date(), new Date());
        break;
    }

    // Publish booking action to Kafka
    await this.kafkaService.publish('agent', {
      businessId,
      channel: source,
      action: 'booking_processed',
      data: bookingResult
    });

    return bookingResult;
  }

  async sendNotification(businessId: string, channel: CommunicationChannel, data: any) {
    // Check if the channel is enabled
    const isEnabled = await this.businessConfigService.isFeatureEnabled(businessId, channel as keyof BusinessFeatures);
    if (!isEnabled) {
      throw new Error(`Channel ${channel} is not enabled for business ${businessId}`);
    }

    // Get communication config
    const config = await this.communicationConfigService.getConfig(businessId);

    // Send notification based on channel
    let result;
    switch (channel) {
      case 'whatsapp':
        result = await this.twilioService.sendWhatsAppMessage(
          businessId,
          data.to,
          data.message,
          config
        );
        break;
      case 'email':
        result = await this.emailService.sendEmail(
          businessId,
          data.to,
          data.subject,
          data.text,
          data.html
        );
        break;
      case 'sms':
        result = await this.smsNotificationService.sendBookingConfirmation(
          businessId,
          {
            customerPhone: data.to,
            ...data.bookingData
          }
        );
        break;
    }

    // Publish notification action to Kafka
    await this.kafkaService.publish('agent', {
      businessId,
      channel,
      action: 'notification_sent',
      data: {
        to: data.to,
        result
      }
    });

    return result;
  }

  private async processSMS(businessId: string, message: any) {
    // Implement SMS processing logic
    return {
      status: 'received',
      message: message.body
    };
  }
} 