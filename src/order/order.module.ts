import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { CartModule } from 'src/cart/cart.module';
import { ProductModule } from 'src/product/product.module';
import { AddressModule } from 'src/address/address.module';
import { PrismaService } from 'src/prisma.service';

@Module({
  imports: [CartModule, ProductModule, AddressModule],
  controllers: [OrderController],
  providers: [OrderService, PrismaService],
  exports: [OrderService],
})
export class OrderModule {}
