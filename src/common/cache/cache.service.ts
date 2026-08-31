import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry {
  data: unknown;
  expiresAt: number;
  tags: string[];
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly store = new Map<string, CacheEntry>();

  // ── SET ───────────────────────────────────────────
  set<T>(key: string, data: T, ttlSeconds = 60, tags: string[] = []) {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
      tags,
    });
  }

  // ── GET ───────────────────────────────────────────
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  // ── GET OR SET (most useful pattern) ──────────────
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttlSeconds: number = 60,
    tags: string[] = [],
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fn();
    this.set(key, data, ttlSeconds, tags);
    return data;
  }

  // ── DELETE ONE KEY ─────────────────────────────────
  delete(key: string) {
    this.store.delete(key);
  }

  // ── DELETE BY PREFIX ───────────────────────────────
  deleteByPrefix(prefix: string) {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    if (count > 0) {
      this.logger.debug(
        `Cache invalidated ${count} keys with prefix: ${prefix}`,
      );
    }
  }

  // ── DELETE BY TAG ──────────────────────────────────
  deleteByTag(tag: string) {
    let count = 0;
    for (const [key, entry] of this.store.entries()) {
      if (entry.tags.includes(tag)) {
        this.store.delete(key);
        count++;
      }
    }
    if (count > 0) {
      this.logger.debug(`Cache invalidated ${count} keys with tag: ${tag}`);
    }
  }

  // ── DELETE BY MULTIPLE TAGS ────────────────────────
  deleteByTags(tags: string[]) {
    tags.forEach((tag) => this.deleteByTag(tag));
  }

  // ── CLEAR ALL ──────────────────────────────────────
  clear() {
    this.store.clear();
    this.logger.debug('Cache cleared entirely');
  }

  // ── CLEANUP EXPIRED (run periodically) ────────────
  cleanup() {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        count++;
      }
    }
    if (count > 0) {
      this.logger.debug(`Cache cleanup: removed ${count} expired entries`);
    }
  }

  // ── STATS ──────────────────────────────────────────
  stats() {
    const now = Date.now();
    let active = 0;
    let expired = 0;

    for (const entry of this.store.values()) {
      if (now > entry.expiresAt) expired++;
      else active++;
    }

    return {
      total: this.store.size,
      active,
      expired,
      keys: [...this.store.keys()],
    };
  }
}
