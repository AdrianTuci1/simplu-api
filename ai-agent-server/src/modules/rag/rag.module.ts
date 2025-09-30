import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { InitialInstructionsService } from './data/initial-instructions';

@Module({
  providers: [RagService, InitialInstructionsService],
  exports: [RagService, InitialInstructionsService],
})
export class RagModule {} 