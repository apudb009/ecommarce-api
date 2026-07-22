import { Module } from '@nestjs/common';
import { FlashSaleService } from './flash-sale.service';
import { FlashSaleController } from './flash-sale.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [FlashSaleController],
  providers: [FlashSaleService, PrismaService],
  exports: [FlashSaleService],
})
export class FlashSaleModule {}
