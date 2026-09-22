import { Module } from '@nestjs/common';
import { ProductVariantImageService } from './product_variant_image.service';

@Module({
  providers: [ProductVariantImageService],
  exports: [ProductVariantImageService],
})
export class ProductVariantImageModule {}
