import {
  IsString,
  IsNumber,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
  IsArray,
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

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[]; // ← variant images URL
}
