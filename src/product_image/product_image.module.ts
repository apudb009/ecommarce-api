import { Module } from '@nestjs/common';
import { ProductImageService } from './product_image.service';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [ProductImageService, PrismaService],
  exports: [ProductImageService],
})
export class ProductImageModule {}
