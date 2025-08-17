import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LambdaAuthorizerGuard } from './guards/lambda-authorizer.guard';
import { PermissionService } from '../resources/services/permission.service';
import { ResourceQueryService } from '../resources/services/resource-query.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, LambdaAuthorizerGuard, PermissionService, ResourceQueryService],
  exports: [AuthService, LambdaAuthorizerGuard, PermissionService],
  imports: [ConfigModule],
})
export class AuthModule {} 