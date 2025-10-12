import { Module } from '@nestjs/common';
import { RatingController } from './rating.controller';
import { RatingService } from './rating.service';
import { ExternalApisModule } from '../external-apis/external-apis.module';
import { BusinessInfoModule } from '../business-info/business-info.module';

@Module({
  imports: [ExternalApisModule, BusinessInfoModule],
  controllers: [RatingController],
  providers: [RatingService],
  exports: [RatingService],
})
export class RatingModule {}

