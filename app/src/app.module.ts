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
    // TypeORM configuration - only when using RDS
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get<string>('database.type');
        
        if (dbType === 'rds') {
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
        } else {
          // For citrus sharding, we'll use a minimal connection or skip TypeORM
          // since Citrus manages its own database connections
          return {
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            username: 'postgres',
            password: 'postgres',
            database: 'default',
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: false,
            logging: false,
            // Disable auto-connection for Citrus mode
            autoLoadEntities: false,
          };
        }
      },
      inject: [ConfigService],
    }),
    AuthModule,
    ResourcesModule,
    BusinessInfoModule,
    HealthModule,
  ],
  providers: [KinesisService],
  exports: [KinesisService],
})
export class AppModule {}
