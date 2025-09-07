import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ElevenLabsService {
  async createEphemeralKey(): Promise<{ key: string }> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('Missing ELEVENLABS_API_KEY');
    }
    const url = 'https://api.elevenlabs.io/v1/realtime/sessions';
    const response = await axios.post(url, {}, {
      headers: { 'xi-api-key': apiKey },
    });
    return { key: response.data?.key as string };
  }
}


