import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { PrismaService } from 'src/prisma.service';
import { OrderModule } from 'src/order/order.module';
import { ProductModule } from 'src/product/product.module';

@Module({
  imports: [OrderModule, ProductModule],
  controllers: [ReviewController],
  providers: [ReviewService, PrismaService],
})
export class ReviewModule {}
