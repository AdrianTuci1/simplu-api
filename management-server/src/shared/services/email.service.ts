import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly sesClient: SESClient;
  private readonly senderEmail: string;

  constructor(private readonly configService: ConfigService) {
    this.sesClient = new SESClient({
      region: this.configService.get('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.senderEmail = this.configService.get('SES_SENDER_EMAIL');
  }

  async sendActivationEmail(toEmail: string, activationUrl: string, businessName: string): Promise<void> {
    try {
      if (!this.senderEmail) {
        this.logger.warn('SES_SENDER_EMAIL not configured; skipping email send');
        return;
      }

      const subject = `Activează contul pentru ${businessName}`;
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Bună,</h2>
          <p>A fost inițiată configurarea contului pentru compania <strong>${businessName}</strong>.</p>
          <p>Te rugăm să accesezi link-ul de mai jos pentru a confirma contul, a adăuga metoda de plată și a activa abonamentul:</p>
          <p><a href="${activationUrl}" style="color: #1a73e8;">Activează serviciul</a></p>
          <p>Dacă nu ai solicitat această acțiune, poți ignora acest email.</p>
          <p>Mulțumim,<br/>Echipa Simplu</p>
        </div>
      `;

      const command = new SendEmailCommand({
        Source: this.senderEmail,
        Destination: {
          ToAddresses: [toEmail],
        },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: htmlBody, Charset: 'UTF-8' },
          },
        },
      });

      await this.sesClient.send(command);
      this.logger.log(`Activation email sent to ${toEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send activation email to ${toEmail}: ${error.message}`, error.stack);
      // Do not throw; business creation should not fail due to email issues
    }
  }
}

