import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export interface EmailParams {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
}

@Injectable()
export class SESService {
  private readonly logger = new Logger(SESService.name);
  private sesClient: SESClient;
  private senderEmail: string;
  private readonly enabled: boolean;

  constructor(private configService: ConfigService) {
    const region = 'eu-central-1';
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    
    const clientConfig: any = { region };
    
    // Only add credentials if both are provided
    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId,
        secretAccessKey,
      };
    }
    
    this.sesClient = new SESClient(clientConfig);

    this.senderEmail = this.configService.get<string>(
      'SES_SENDER_EMAIL',
      'no-reply@simplu.io'
    );

    this.enabled = this.configService.get<boolean>('SES_ENABLED', true);

    this.logger.log(`SES Service initialized - Sender: ${this.senderEmail}, Region: ${region}, Enabled: ${this.enabled}`);
  }

  async sendEmail(params: EmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.enabled) {
      this.logger.warn('SES is disabled, email not sent');
      return { success: false, error: 'SES is disabled' };
    }

    try {
      const toAddresses = Array.isArray(params.to) ? params.to : [params.to];

      this.logger.log(`Sending email to ${toAddresses.join(', ')} - Subject: ${params.subject}`);

      const command = new SendEmailCommand({
        Source: this.senderEmail,
        Destination: {
          ToAddresses: toAddresses,
        },
        Message: {
          Subject: {
            Data: params.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: params.body,
              Charset: 'UTF-8',
            },
            Html: params.html ? {
              Data: params.html,
              Charset: 'UTF-8',
            } : undefined,
          },
        },
      });

      const response = await this.sesClient.send(command);

      this.logger.log(`Email sent successfully - MessageId: ${response.MessageId}`);

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send invitation email to a new team member
   */
  async sendInvitationEmail(params: {
    to: string;
    businessName: string;
    inviterName: string;
    invitationUrl: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    this.logger.log(`Preparing invitation email:`, {
      to: params.to,
      businessName: params.businessName,
      inviterName: params.inviterName,
      urlLength: params.invitationUrl.length,
    });

    const subject = `Invitație de la ${params.businessName} - simplu.io`;

    const textBody = `
Salut!

${params.inviterName} te-a invitat să te alături echipei ${params.businessName} pe platforma simplu.io.

Pentru a accepta invitația și a-ți crea contul, accesează linkul de mai jos:

${params.invitationUrl}

Linkul este valabil 7 zile.

Dacă nu ai solicitat această invitație, poți ignora acest email.

Cu stimă,
Echipa simplu.io
    `.trim();

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Invitație simplu.io</h1>
    </div>
    <div class="content">
      <p>Salut!</p>
      
      <p><strong>${params.inviterName}</strong> te-a invitat să te alături echipei <strong>${params.businessName}</strong> pe platforma simplu.io.</p>
      
      <p>Pentru a accepta invitația și a-ți crea contul, accesează linkul de mai jos:</p>
      
      <center>
        <a href="${params.invitationUrl}" class="button">Acceptă Invitația</a>
      </center>
      
      <p style="color: #6b7280; font-size: 14px;">
        Sau copiază și lipește acest link în browser:<br>
        <code style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${params.invitationUrl}</code>
      </p>
      
      <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
        <em>Linkul este valabil 7 zile.</em>
      </p>
      
      <p style="color: #6b7280; font-size: 14px;">
        Dacă nu ai solicitat această invitație, poți ignora acest email.
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} simplu.io - Toate drepturile rezervate</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.sendEmail({
      to: params.to,
      subject,
      body: textBody,
      html: htmlBody,
    });
  }
}

