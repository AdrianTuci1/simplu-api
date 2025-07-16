import { Module } from '@nestjs/common';
import { BusinessInfoController } from './business-info.controller';
import { BusinessInfoService } from './business-info.service';

@Module({
  imports: [],
  controllers: [BusinessInfoController],
  providers: [BusinessInfoService],
  exports: [BusinessInfoService],
})
export class BusinessInfoModule {}
