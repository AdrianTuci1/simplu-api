import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DATABASE_HOST'),
  port: configService.get('DATABASE_PORT'),
  username: configService.get('DATABASE_USERNAME'),
  password: configService.get('DATABASE_PASSWORD'),
  database: configService.get('DATABASE_NAME'),
  entities: [
    __dirname + '/../token/*.entity{.ts,.js}',
    // Note: Conversations are stored in DynamoDB, not PostgreSQL
  ],
  synchronize: true, // Auto-create tables for token management
  logging: configService.get('NODE_ENV') !== 'production',
}); 