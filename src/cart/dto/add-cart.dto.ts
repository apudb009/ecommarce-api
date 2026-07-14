import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateCartDto {
  @IsInt()
  @Type(() => Number)
  productId!: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number = 1;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  taxAmount: number = 0;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  shippingAmount: number = 0;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  grandTotalAmount: number = 0;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  variantId?: number;
}
