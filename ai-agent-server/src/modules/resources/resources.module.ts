import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ResourcesService } from './resources.service';

@Module({
  imports: [HttpModule],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {} 