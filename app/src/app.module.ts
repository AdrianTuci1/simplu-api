import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DefaultNamingStrategy } from 'typeorm';
import configuration from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { BusinessInfoModule } from './modules/business-info/business-info.module';
import { KafkaModule } from './modules/kafka/kafka.module';
import { RedisModule } from './modules/redis/redis.module';

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
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV !== 'production',
        namingStrategy: new CustomNamingStrategy(),
      }),
      inject: [ConfigService],
    }),
    KafkaModule,
    RedisModule,
    AuthModule,
    ResourcesModule,
    BusinessInfoModule,
  ],
})
export class AppModule {}
