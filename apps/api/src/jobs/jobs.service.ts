import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { CacheService } from './cache.service.js';

export interface RefreshPayload {
  countryCode?: string;
  committee?: string;
  reason?: string;
}

function connectionFromUrl(url: string): ConnectionOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    db: Number(parsed.pathname.replace('/', '') || 0),
    maxRetriesPerRequest: null,
    tls: parsed.protocol === 'rediss:' ? { servername: parsed.hostname } : undefined,
  };
}

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private mode: 'bullmq' | 'inline' = 'inline';

  constructor(private readonly cache: CacheService) {}

  async onModuleInit(): Promise<void> {
    const url = process.env.REDIS_URL?.trim();
    if (!url || this.cache.backend !== 'redis') {
      this.logger.warn('Cola BullMQ en modo inline (sin Redis). Los jobs se ejecutan de forma simulada.');
      return;
    }

    try {
      const connection = connectionFromUrl(url);
      this.queue = new Queue('debamun-jobs', { connection });
      this.worker = new Worker(
        'debamun-jobs',
        async (job) => {
          this.logger.log(`Job ${job.name} procesado (${job.id ?? 'sin id'}).`);
          return { ok: true, processedAt: new Date().toISOString() };
        },
        { connection, concurrency: 2 },
      );
      this.worker.on('failed', (job, error) => {
        this.logger.warn(`Job ${job?.name ?? 'desconocido'} falló: ${error.message}`);
      });
      this.worker.on('error', (error) => {
        this.logger.warn(`Error del worker BullMQ: ${error.message}`);
      });
      this.mode = 'bullmq';
      this.logger.log('Cola BullMQ conectada.');
    } catch (error) {
      this.logger.warn(`BullMQ no disponible (${(error as Error).message}). Se usa modo inline.`);
      this.mode = 'inline';
    }
  }

  async enqueueResearchRefresh(payload: RefreshPayload) {
    if (this.queue) {
      const job = await this.queue.add('research-refresh', payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 50,
      });
      return { id: String(job.id), mode: 'bullmq' as const, payload };
    }

    return {
      id: `inline-${Date.now().toString(36)}`,
      mode: 'inline' as const,
      payload,
      note: 'Redis no está configurado. El job queda registrado pero no se ejecuta en segundo plano.',
    };
  }

  async status() {
    if (this.queue) {
      const counts = await this.queue.getJobCounts('waiting', 'active', 'completed', 'failed');
      return { mode: this.mode, counts };
    }
    return {
      mode: this.mode,
      counts: { waiting: 0, active: 0, completed: 0, failed: 0 },
      note: 'Modo inline: configura REDIS_URL para habilitar BullMQ.',
    };
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
  }
}
