import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DefaultNamingStrategy } from 'typeorm';
import configuration from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { ClientsModule } from './modules/clients/clients.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { StockModule } from './modules/stock/stock.module';
import { ServicesModule } from './modules/services/services.module';
import { PublicSiteModule } from './modules/public-site/public-site.module';
import { KafkaModule } from './modules/kafka/kafka.module';
import { RedisModule } from './modules/redis/redis.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { PackagesModule } from './modules/packages/packages.module';
import { HistoryModule } from './modules/history/history.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RolesModule } from './modules/roles/roles.module';
import { UserDataModule } from './modules/user-data/user-data.module';

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
    TenantsModule,
    ClientsModule,
    EmployeesModule,
    ReservationsModule,
    StockModule,
    ServicesModule,
    PublicSiteModule,
    InvoicesModule,
    TimelineModule,
    PackagesModule,
    HistoryModule,
    WorkflowsModule,
    ReportsModule,
    RolesModule,
    UserDataModule,
  ],
})
export class AppModule {}
