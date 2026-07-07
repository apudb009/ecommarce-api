import { Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class ApplyCouponDto {
  @IsString()
  code!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  orderAmount!: number;
}
