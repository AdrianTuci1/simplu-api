import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ApiResourceService } from './api-resource.service';

@Module({
  imports: [HttpModule],
  providers: [ApiResourceService],
  exports: [ApiResourceService],
})
export class ResourcesModule {} 