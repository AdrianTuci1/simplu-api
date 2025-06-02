import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as imap from 'imap';
import { simpleParser } from 'mailparser';
import { CommunicationConfigService } from '../services/communication-config.service';

@Injectable()
export class EmailService {
  private transporterCache: Map<string, nodemailer.Transporter> = new Map();
  private imapConfigCache: Map<string, imap.Config> = new Map();

  constructor(
    private configService: ConfigService,
    private communicationConfigService: CommunicationConfigService,
  ) {}

  private async getTransporter(tenantId: string): Promise<nodemailer.Transporter> {
    // Check cache first
    const cachedTransporter = this.transporterCache.get(tenantId);
    if (cachedTransporter) {
      return cachedTransporter;
    }

    // Get tenant-specific config
    const config = await this.communicationConfigService.getConfig(tenantId);
    
    // Create new transporter
    const transporter = nodemailer.createTransport({
      host: config.email.smtpHost,
      port: config.email.smtpPort,
      secure: true,
      auth: {
        user: config.email.smtpUser,
        pass: config.email.smtpPassword,
      },
    });
    
    // Cache the transporter
    this.transporterCache.set(tenantId, transporter);
    return transporter;
  }

  private async getImapConfig(tenantId: string): Promise<imap.Config> {
    // Check cache first
    const cachedConfig = this.imapConfigCache.get(tenantId);
    if (cachedConfig) {
      return cachedConfig;
    }

    // Get tenant-specific config
    const config = await this.communicationConfigService.getConfig(tenantId);
    
    // Create IMAP config
    const imapConfig: imap.Config = {
      user: config.email.imapUser,
      password: config.email.imapPassword,
      host: config.email.imapHost,
      port: config.email.imapPort,
      tls: true,
    };
    
    // Cache the config
    this.imapConfigCache.set(tenantId, imapConfig);
    return imapConfig;
  }

  async sendEmail(tenantId: string, to: string, subject: string, text: string, html?: string) {
    try {
      const transporter = await this.getTransporter(tenantId);
      const config = await this.communicationConfigService.getConfig(tenantId);

      const info = await transporter.sendMail({
        from: config.email.emailFrom,
        to,
        subject,
        text,
        html,
      });
      return info;
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async readEmails(tenantId: string) {
    const imapConfig = await this.getImapConfig(tenantId);
    
    return new Promise((resolve, reject) => {
      const imapConnection = new imap(imapConfig);
      const emails: any[] = [];

      imapConnection.once('ready', () => {
        imapConnection.openBox('INBOX', false, (err, box) => {
          if (err) reject(err);

          const fetch = imapConnection.seq.fetch('1:*', {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
            struct: true,
          });

          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              simpleParser(stream, async (err, parsed) => {
                if (err) reject(err);
                emails.push(parsed);
              });
            });
          });

          fetch.once('error', (err) => {
            reject(err);
          });

          fetch.once('end', () => {
            imapConnection.end();
            resolve(emails);
          });
        });
      });

      imapConnection.once('error', (err) => {
        reject(err);
      });

      imapConnection.connect();
    });
  }

  clearCache(tenantId?: string) {
    if (tenantId) {
      this.transporterCache.delete(tenantId);
      this.imapConfigCache.delete(tenantId);
    } else {
      this.transporterCache.clear();
      this.imapConfigCache.clear();
    }
  }
} 