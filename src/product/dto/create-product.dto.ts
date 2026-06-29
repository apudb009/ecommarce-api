import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MinLength,
  Min,
  IsNumber,
  IsBoolean,
  IsArray,
  IsInt,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(4)
  name!: string;

  @IsString()
  slug!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  @Type(() => Number)
  price!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsInt()
  @Type(() => Number)
  categoryId!: number;
}
