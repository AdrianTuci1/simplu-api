import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DefaultNamingStrategy } from 'typeorm';
import configuration from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { BusinessInfoModule } from './modules/business-info/business-info.module';
import { HealthModule } from './modules/health/health.module';
import { KinesisService } from './kinesis.service';
import { PatientBookingModule } from './modules/patient-booking/patient-booking.module';
import { InvitationsModule } from './modules/invitations/invitations.module';

class CustomNamingStrategy extends DefaultNamingStrategy {
  tableName(targetName: string, userSpecifiedName: string | undefined): string {
    return userSpecifiedName || targetName;
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    // TypeORM configuration for RDS
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const rdsConfig = configService.get('database.rds');
        return {
          type: 'postgres',
          host: rdsConfig.host,
          port: rdsConfig.port,
          username: rdsConfig.username,
          password: rdsConfig.password,
          database: rdsConfig.database,
          ssl: rdsConfig.ssl ? { rejectUnauthorized: false } : false,
          synchronize: rdsConfig.synchronize,
          logging: rdsConfig.logging,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          namingStrategy: new CustomNamingStrategy(),
          // Additional connection options
          extra: {
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
            max: 20,
          },
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    ResourcesModule,
    BusinessInfoModule,
    HealthModule,
    PatientBookingModule,
    InvitationsModule,
  ],
  providers: [KinesisService],
  exports: [KinesisService],
})
export class AppModule {}
