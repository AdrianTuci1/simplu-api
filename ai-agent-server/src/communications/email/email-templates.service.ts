import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommunicationConfigService } from '../services/communication-config.service';
import { EmailService } from './email.service';

@Injectable()
export class EmailTemplatesService {
  constructor(
    private configService: ConfigService,
    private communicationConfigService: CommunicationConfigService,
    private emailService: EmailService,
  ) {}

  private readonly templates = {
    bookingConfirmation: (data: any) => ({
      subject: 'Booking Confirmation',
      html: `
        <h1>Booking Confirmation</h1>
        <p>Dear ${data.customerName},</p>
        <p>Your booking has been confirmed for ${data.roomType} from ${data.checkIn} to ${data.checkOut}.</p>
        <p>Booking Details:</p>
        <ul>
          <li>Room Type: ${data.roomType}</li>
          <li>Check-in: ${data.checkIn}</li>
          <li>Check-out: ${data.checkOut}</li>
          <li>Number of Guests: ${data.numberOfGuests}</li>
        </ul>
        <p>Thank you for choosing our service!</p>
      `,
    }),

    bookingCancellation: (data: any) => ({
      subject: 'Booking Cancellation',
      html: `
        <h1>Booking Cancellation</h1>
        <p>Dear ${data.customerName},</p>
        <p>Your booking for ${data.roomType} from ${data.checkIn} to ${data.checkOut} has been cancelled.</p>
        <p>If you did not request this cancellation, please contact us immediately.</p>
      `,
    }),

    paymentConfirmation: (data: any) => ({
      subject: 'Payment Confirmation',
      html: `
        <h1>Payment Confirmation</h1>
        <p>Dear ${data.customerName},</p>
        <p>We have received your payment of ${data.amount} for your booking.</p>
        <p>Payment Details:</p>
        <ul>
          <li>Amount: ${data.amount}</li>
          <li>Transaction ID: ${data.transactionId}</li>
          <li>Date: ${data.date}</li>
        </ul>
      `,
    }),

    checkInReminder: (data: any) => ({
      subject: 'Check-in Reminder',
      html: `
        <h1>Check-in Reminder</h1>
        <p>Dear ${data.customerName},</p>
        <p>This is a reminder that your check-in is scheduled for ${data.checkIn}.</p>
        <p>We look forward to welcoming you!</p>
      `,
    }),
  };

  async sendTemplatedEmail(
    tenantId: string,
    to: string,
    templateName: keyof typeof this.templates,
    data: any,
  ) {
    const template = this.templates[templateName](data);
    return this.emailService.sendEmail(
      tenantId,
      to,
      template.subject,
      template.html,
      template.html,
    );
  }

  async sendBookingConfirmation(tenantId: string, bookingData: any) {
    return this.sendTemplatedEmail(
      tenantId,
      bookingData.customerEmail,
      'bookingConfirmation',
      bookingData,
    );
  }

  async sendBookingCancellation(tenantId: string, bookingData: any) {
    return this.sendTemplatedEmail(
      tenantId,
      bookingData.customerEmail,
      'bookingCancellation',
      bookingData,
    );
  }

  async sendPaymentConfirmation(tenantId: string, paymentData: any) {
    return this.sendTemplatedEmail(
      tenantId,
      paymentData.customerEmail,
      'paymentConfirmation',
      paymentData,
    );
  }

  async sendCheckInReminder(tenantId: string, bookingData: any) {
    return this.sendTemplatedEmail(
      tenantId,
      bookingData.customerEmail,
      'checkInReminder',
      bookingData,
    );
  }
} 