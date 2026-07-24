import { Module } from '@nestjs/common';
import { OrderTrackingController } from './order-tracking.controller';
import { OrderTrackingService } from './order-tracking.service';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [OrderTrackingController],
  providers: [OrderTrackingService, PrismaService],
  exports: [OrderTrackingService],
})
export class OrderTrackingModule {}
