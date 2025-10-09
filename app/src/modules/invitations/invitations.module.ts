import { Module } from '@nestjs/common';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { SESService } from '../shared/services/ses.service';
import { ResourcesModule } from '../resources/resources.module';
import { BusinessInfoModule } from '../business-info/business-info.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ResourcesModule, BusinessInfoModule, AuthModule],
  controllers: [InvitationsController],
  providers: [InvitationsService, SESService],
  exports: [InvitationsService],
})
export class InvitationsModule {}

