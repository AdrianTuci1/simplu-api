import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TenantType } from '../sms/sms-notification.service';

@Entity('communication_configs')
export class CommunicationConfig {
  @PrimaryColumn()
  tenantId: string;

  @Column({
    type: 'enum',
    enum: TenantType,
    default: TenantType.HOTEL
  })
  tenantType: TenantType;

  @Column('jsonb')
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
    whatsappNumber: string;
  };

  @Column('jsonb')
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    emailFrom: string;
    imapHost: string;
    imapPort: number;
    imapUser: string;
    imapPassword: string;
  };

  @Column('jsonb')
  openai: {
    apiKey: string;
    modelName: string;
    temperature: number;
  };

  @Column('jsonb')
  booking: {
    apiUrl: string;
    apiKey: string;
    webhookSecret: string;
  };

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 