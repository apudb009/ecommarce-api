import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { CartModule } from 'src/cart/cart.module';
import { ProductModule } from 'src/product/product.module';
import { AddressModule } from 'src/address/address.module';
import { PrismaService } from 'src/prisma.service';
import { InvoiceModule } from 'src/invoice/invoice.module';
import { CouponModule } from 'src/coupon/coupon.module';

@Module({
  imports: [
    CartModule,
    ProductModule,
    AddressModule,
    InvoiceModule,
    CouponModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, PrismaService],
  exports: [OrderService],
})
export class OrderModule {}
