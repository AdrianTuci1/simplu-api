import { Module } from '@nestjs/common';
import { PublicSiteService } from './public-site.service';
import { PublicSiteController } from './public-site.controller';
import { TenantsModule } from '../tenants/tenants.module';
import { ServicesModule } from '../services/services.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [TenantsModule, ServicesModule, RedisModule],
  controllers: [PublicSiteController],
  providers: [PublicSiteService],
  exports: [PublicSiteService],
})
export class PublicSiteModule {} 