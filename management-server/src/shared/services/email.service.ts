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

  async sendBusinessInvitationEmail(
    toEmail: string, 
    businessName: string, 
    businessId: string, 
    invitationUrl: string,
    createdByEmail?: string,
    temporaryPassword?: string
  ): Promise<void> {
    try {
      if (!this.senderEmail) {
        this.logger.warn('SES_SENDER_EMAIL not configured; skipping invitation email send');
        return;
      }

      const subject = `Invitație pentru ${businessName} - Simplu`;
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a73e8;">Bun venit la ${businessName}!</h2>
          
          <p>A fost creat un cont pentru compania <strong>${businessName}</strong> în sistemul Simplu.</p>
          
          ${temporaryPassword ? `
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Detalii de autentificare:</h3>
            <p><strong>Email:</strong> ${toEmail}</p>
            <p><strong>Parolă temporară:</strong> <code style="background-color: #e9ecef; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${temporaryPassword}</code></p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #856404;">⚠️ Importante:</h4>
            <ul style="margin-bottom: 0; color: #856404;">
              <li>Te rugăm să te autentifici imediat și să schimbi parola temporară</li>
              <li>Parola temporară este valabilă doar pentru prima autentificare</li>
              <li>După prima autentificare, vei fi obligat să alegi o parolă nouă</li>
            </ul>
          </div>
          ` : ''}
          
          <div style="margin: 30px 0;">
            <a href="${invitationUrl}" 
               style="background-color: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              ${temporaryPassword ? 'Accesează contul' : 'Creează contul și activează serviciul'}
            </a>
          </div>
          
          ${createdByEmail ? `<p><small>Contul a fost creat de: ${createdByEmail}</small></p>` : ''}
          
          <p>Dacă nu ai solicitat această acțiune, poți ignora acest email.</p>
          
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            Cu respect,<br>
            Echipa Simplu
          </p>
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
      this.logger.log(`Business invitation email sent to ${toEmail} for business ${businessId}`);
    } catch (error) {
      this.logger.error(`Failed to send business invitation email to ${toEmail}: ${error.message}`, error.stack);
      // Do not throw; business creation should not fail due to email issues
    }
  }
}

