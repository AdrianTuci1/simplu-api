import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LambdaAuthorizerGuard } from './guards/lambda-authorizer.guard';
import { ResourcesModule } from '../resources/resources.module';

@Module({
  controllers: [AuthController],
  providers: [AuthService, LambdaAuthorizerGuard],
  exports: [AuthService, LambdaAuthorizerGuard],
  imports: [ConfigModule, ResourcesModule],
})
export class AuthModule {} 