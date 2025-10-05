import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourcesModule } from './modules/resources/resources.module';
import { KinesisModule } from './modules/kinesis/kinesis.module';
import { SqsModule } from './modules/sqs/sqs.module';
import { HealthModule } from './modules/health/health.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
    }),
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
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: false, // Set to false for production
            logging: true,
          };
        } else {
          // For citrus sharding, we'll use a default connection
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
          };
        }
      },
      inject: [ConfigService],
    }),
    ResourcesModule,
    KinesisModule,
    SqsModule,
    HealthModule,
  ],
})
export class AppModule {} 