import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDataController } from './user-data.controller';
import { UserDataService } from './user-data.service';
import { UserData } from './entities/user-data.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserData])],
  controllers: [UserDataController],
  providers: [UserDataService],
  exports: [UserDataService],
})
export class UserDataModule {} 