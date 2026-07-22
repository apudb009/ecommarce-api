import { Test, TestingModule } from '@nestjs/testing';
import { ProductVariantImageService } from './product_variant_image.service';

describe('ProductVariantImageService', () => {
  let service: ProductVariantImageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductVariantImageService],
    }).compile();

    service = module.get<ProductVariantImageService>(ProductVariantImageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
