import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationConfig } from './communication-config.entity';
import { BusinessConfig } from './business-config.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([CommunicationConfig, BusinessConfig]),
  ],
  providers: [
    {
      provide: 'COMMUNICATION_CONFIG_REPOSITORY',
      useFactory: (repository) => repository,
      inject: [getRepositoryToken(CommunicationConfig)],
    },
  ],
  exports: [TypeOrmModule, 'COMMUNICATION_CONFIG_REPOSITORY'],
})
export class EntitiesModule {} 