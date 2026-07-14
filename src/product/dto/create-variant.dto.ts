import {
  IsString,
  IsNumber,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVariantDto {
  @IsString()
  name!: string; // "Size"

  @IsString()
  value!: string; // "Large"

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  stock!: number;

  @IsString()
  sku!: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsString()
  @IsOptional()
  color?: string; // ← hex color e.g. "#FF5733"

  @IsString()
  @IsOptional()
  image?: string; // ← variant image URL
}
