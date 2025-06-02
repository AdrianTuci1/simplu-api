import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
  ) {}

  async onModuleDestroy() {
    await this.redisClient.quit();
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redisClient.set(key, value, { EX: ttl });
    } else {
      await this.redisClient.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  async del(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redisClient.exists(key);
    return result === 1;
  }

  async setHash(key: string, field: string, value: string): Promise<void> {
    await this.redisClient.hSet(key, field, value);
  }

  async getHash(key: string, field: string): Promise<string | null> {
    const result = await this.redisClient.hGet(key, field);
    return result ?? null;
  }

  async getAllHash(key: string): Promise<Record<string, string>> {
    return this.redisClient.hGetAll(key);
  }

  async delHash(key: string, field: string): Promise<void> {
    await this.redisClient.hDel(key, field);
  }
} 