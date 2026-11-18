import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly memory = new Map<string, MemoryEntry>();
  private redis: Redis | null = null;
  private mode: 'redis' | 'memory' = 'memory';

  async onModuleInit(): Promise<void> {
    const url = process.env.REDIS_URL?.trim();
    if (!url) {
      this.logger.warn('REDIS_URL no configurada: caché en memoria (válida para desarrollo).');
      return;
    }

    try {
      const client = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 1500,
        enableOfflineQueue: false,
        retryStrategy: () => null,
      });
      client.on('error', () => undefined);
      await client.connect();
      await client.ping();
      this.redis = client;
      this.mode = 'redis';
      this.logger.log('Redis conectado: caché compartida habilitada.');
    } catch (error) {
      this.logger.warn(`Redis no disponible (${(error as Error).message}). Se usa caché en memoria.`);
      this.redis?.disconnect();
      this.redis = null;
      this.mode = 'memory';
    }
  }

  get backend(): 'redis' | 'memory' {
    return this.mode;
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis) {
      try {
        const raw = await this.redis.get(key);
        if (raw) return JSON.parse(raw) as T;
      } catch (error) {
        this.logger.warn(`Fallo de lectura en Redis: ${(error as Error).message}`);
      }
    }

    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return JSON.parse(entry.value) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);
    this.memory.set(key, { value: serialized, expiresAt: Date.now() + ttlSeconds * 1000 });
    if (this.memory.size > 800) this.compact();

    if (this.redis) {
      try {
        await this.redis.setex(key, ttlSeconds, serialized);
      } catch (error) {
        this.logger.warn(`Fallo de escritura en Redis: ${(error as Error).message}`);
      }
    }
  }

  async del(key: string): Promise<void> {
    this.memory.delete(key);
    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch {
        // La caché es best-effort; no debe romper la petición.
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit().catch(() => undefined);
  }

  private compact(): void {
    const now = Date.now();
    for (const [key, entry] of this.memory) {
      if (entry.expiresAt <= now) this.memory.delete(key);
    }
  }
}
