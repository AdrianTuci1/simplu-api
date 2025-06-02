export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  whatsappNumber: string;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  emailFrom: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
}

export interface CommunicationConfig {
  tenantId: string;
  twilio: TwilioConfig;
  email: EmailConfig;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
} 