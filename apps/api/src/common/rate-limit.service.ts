import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface Bucket {
  count: number;
  resetAt: number;
}

/** Límite de ventana fija en memoria. En producción se sustituye por Redis. */
@Injectable()
export class RateLimitService {
  private readonly buckets = new Map<string, Bucket>();

  check(key: string, max: number, windowMs: number): void {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      if (this.buckets.size > 5000) this.compact(now);
      return;
    }

    if (bucket.count >= max) {
      const seconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      throw new HttpException(
        `Demasiadas solicitudes. Intenta de nuevo en ${seconds} s.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.count += 1;
  }

  private compact(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}
