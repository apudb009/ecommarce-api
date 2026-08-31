// src/cache/cache.controller.ts
import { Controller, Get, Delete } from '@nestjs/common';
import { CacheService } from 'src/common/cache/cache.service';

@Controller('api/cache')
export class CacheController {
  constructor(private cache: CacheService) {}

  // GET /api/cache/stats
  @Get('stats')
  stats() {
    return this.cache.stats();
  }

  // DELETE /api/cache — clear everything
  @Delete()
  clearAll() {
    this.cache.clear();
    return { message: 'Cache cleared' };
  }
}
