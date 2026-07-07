import { Type } from 'class-transformer';
import {
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
  IsInt,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { CouponType } from 'src/generated/prisma/enums';

export class CreateCouponDto {
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  code!: string;

  @IsEnum(CouponType)
  type!: CouponType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  value!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minOrderAmount?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  maxUses?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  perUserLimit?: number = 1;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
