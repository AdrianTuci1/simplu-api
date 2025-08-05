import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthEnvelopeService } from './services/auth-envelope.service';
import { CognitoAuthGuard } from './guards/cognito-auth.guard';
import { RedisModule } from '../redis/redis.module';
import { BusinessInfoModule } from '../business-info/business-info.module';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    BusinessInfoModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('jwt.secret', 'fallback-secret'),
        signOptions: {
          expiresIn: configService.get('jwt.expiresIn', '1h'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthEnvelopeService, CognitoAuthGuard],
  exports: [AuthService, AuthEnvelopeService, CognitoAuthGuard],
})
export class AuthModule {}
