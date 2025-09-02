import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CognitoAuthGuard } from './guards/cognito-auth.guard';
import { ResourceEntity } from '../resources/entities/resource.entity';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'fallback-secret',
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([ResourceEntity]),
  ],
  controllers: [AuthController],
  providers: [AuthService, CognitoAuthGuard],
  exports: [AuthService, CognitoAuthGuard],
})
export class AuthModule {}
