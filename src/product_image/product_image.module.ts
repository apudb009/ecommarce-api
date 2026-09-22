import { Module } from '@nestjs/common';
import { ProductImageService } from './product_image.service';

@Module({
  providers: [ProductImageService],
  exports: [ProductImageService],
})
export class ProductImageModule {}
