import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { CategoryModule } from 'src/category/category.module';
import { PrismaService } from 'src/prisma.service';
import { ProductImageModule } from 'src/product_image/product_image.module';

@Module({
  imports: [CategoryModule, ProductImageModule],
  controllers: [ProductController],
  providers: [ProductService, PrismaService],
  exports: [ProductService],
})
export class ProductModule {}
