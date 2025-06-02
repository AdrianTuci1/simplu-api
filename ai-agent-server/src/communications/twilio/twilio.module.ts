import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TwilioService } from './twilio.service';
import { TwilioController } from './twilio.controller';
import { CommunicationConfigModule } from '../services/communication-config.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => CommunicationConfigModule),
  ],
  providers: [TwilioService],
  controllers: [TwilioController],
  exports: [TwilioService],
})
export class TwilioModule {} 