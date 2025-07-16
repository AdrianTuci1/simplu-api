import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly redis: Redis;

  constructor(private configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('redis.host'),
      port: this.configService.get('redis.port'),
      password: this.configService.get('redis.password'),
      db: this.configService.get('redis.db'),
    });
  }

  async onModuleInit() {
    await this.redis.ping();
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.set(key, value, 'EX', ttl);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async getHash(key: string): Promise<Record<string, string>> {
    return this.redis.hgetall(key);
  }

  async setHash(key: string, data: Record<string, string>): Promise<void> {
    await this.redis.hmset(key, data);
  }

  async delHash(key: string, field: string): Promise<void> {
    await this.redis.hdel(key, field);
  }

  async getTenantCache(tenantId: string, key: string): Promise<string | null> {
    return this.get(`tenant:${tenantId}:${key}`);
  }

  async setTenantCache(
    tenantId: string,
    key: string,
    value: string,
    ttl?: number,
  ): Promise<void> {
    await this.set(`tenant:${tenantId}:${key}`, value, ttl);
  }

  async invalidateTenantCache(
    tenantId: string,
    pattern: string,
  ): Promise<void> {
    const keys = await this.redis.keys(`tenant:${tenantId}:${pattern}`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
