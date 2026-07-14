import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { PrismaService } from 'src/prisma.service';
import { ProductModule } from 'src/product/product.module';
import { CouponModule } from 'src/coupon/coupon.module';
import { TaxModule } from 'src/tax/tax.module';
import { ShippingModule } from 'src/shipping/shipping.module';

@Module({
  imports: [ProductModule, CouponModule, TaxModule, ShippingModule],
  controllers: [CartController],
  providers: [CartService, PrismaService],
  exports: [CartService],
})
export class CartModule {}
