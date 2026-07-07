// common/common.module.ts
import { Module, Global } from '@nestjs/common';
import { ProductHelper } from './helpers/product.helper';
import { PrismaService } from 'src/prisma.service';

@Global() // ← available everywhere without importing
@Module({
  providers: [ProductHelper, PrismaService],
  exports: [ProductHelper],
})
export class CommonModule {}
