import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CognitoAuthGuard } from './guards/cognito-auth.guard';
import { ResourceEntity } from '../resources/entities/resource.entity';
import { BusinessInfoService } from '../business-info/business-info.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'fallback-secret',
        signOptions: { expiresIn: '30d' },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([ResourceEntity]),
  ],
  controllers: [AuthController],
  providers: [AuthService, CognitoAuthGuard, BusinessInfoService],
  exports: [AuthService, CognitoAuthGuard],
})
export class AuthModule {}
