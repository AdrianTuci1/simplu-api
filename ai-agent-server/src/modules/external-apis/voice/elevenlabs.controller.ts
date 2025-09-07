import { Controller, Get } from '@nestjs/common';
import { ElevenLabsService } from './elevenlabs.service';

@Controller('external/voice/elevenlabs')
export class ElevenLabsController {
  constructor(private readonly eleven: ElevenLabsService) {}

  @Get('session')
  async createSession() {
    return this.eleven.createEphemeralKey();
  }
}


