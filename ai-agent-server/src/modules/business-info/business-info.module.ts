import { Module } from '@nestjs/common';
import { BusinessInfoService } from './business-info.service';

@Module({
  providers: [BusinessInfoService],
  exports: [BusinessInfoService],
})
export class BusinessInfoModule {} 