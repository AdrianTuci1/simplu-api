import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TwilioModule } from './twilio/twilio.module';
import { EmailService } from './email/email.service';
import { BookingService } from './booking/booking.service';
import { BookingIntegrationService } from './booking/booking-integration.service';
import { EmailTemplatesService } from './email/email-templates.service';
import { WhatsAppConversationService } from './whatsapp/whatsapp-conversation.service';
import { CommunicationConfigModule } from './services/communication-config.module';
import { BusinessConfigService } from './services/business-config.service';
import { CommunicationAgentService } from './services/communication-agent.service';
import { CommunicationConfigController } from './controllers/communication-config.controller';
import { BusinessConfig } from './entities/business-config.entity';
import { SMSNotificationService } from './sms/sms-notification.service';
import { KafkaService } from './kafka/kafka.service';
import { EntitiesModule } from './entities/entities.module';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    TypeOrmModule.forFeature([BusinessConfig]),
    forwardRef(() => TwilioModule),
    CommunicationConfigModule,
    EntitiesModule,
  ],
  providers: [
    EmailService,
    BookingService,
    BookingIntegrationService,
    EmailTemplatesService,
    WhatsAppConversationService,
    BusinessConfigService,
    CommunicationAgentService,
    SMSNotificationService,
    KafkaService,
  ],
  controllers: [CommunicationConfigController],
  exports: [
    TwilioModule,
    EmailService,
    BookingService,
    BookingIntegrationService,
    EmailTemplatesService,
    WhatsAppConversationService,
    CommunicationConfigModule,
    BusinessConfigService,
    CommunicationAgentService,
    SMSNotificationService,
    KafkaService,
  ],
})
export class CommunicationsModule {} 