import { Module, Global } from '@nestjs/common';
import { ProductHelper } from './helpers/product.helper';
import { PrismaService } from 'src/prisma.service';
import { CacheService } from './cache/cache.service';
import { CacheController } from './cache/cache.controller';

@Global() // ← available everywhere without importing
@Module({
  controllers: [CacheController],
  providers: [ProductHelper, PrismaService, CacheService],
  exports: [ProductHelper, CacheService],
})
export class CommonModule {}
