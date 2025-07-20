import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenService } from './token.service';
import { TokenController } from './token.controller';
import { BusinessToken, TokenUsageLog } from './token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BusinessToken, TokenUsageLog]),
  ],
  providers: [TokenService],
  controllers: [TokenController],
  exports: [TokenService],
})
export class TokenModule {} 