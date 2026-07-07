import { Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class AddCouponToCartDto {
  @IsString()
  couponCode!: string;

  @IsNumber()
  @Type(() => Number)
  discount!: number;

  @IsNumber()
  @Type(() => Number)
  finalAmount!: number;
}
