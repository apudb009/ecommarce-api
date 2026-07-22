import { Module } from '@nestjs/common';
import { ProductVariantImageService } from './product_variant_image.service';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [ProductVariantImageService, PrismaService],
  exports: [ProductVariantImageService],
})
export class ProductVariantImageModule {}
