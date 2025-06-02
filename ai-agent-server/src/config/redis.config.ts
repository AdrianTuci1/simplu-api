import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

export const getRedisConfig = (configService: ConfigService) => {
  const client = createClient({
    url: `redis://${configService.get('REDIS_HOST')}:${configService.get('REDIS_PORT')}`,
  });

  client.on('error', (err) => console.error('Redis Client Error', err));
  client.on('connect', () => console.log('Redis Client Connected'));

  return client;
}; 