import {
  IsOptional,
  IsString,
  IsInt,
  IsNumber,
  IsBoolean,
  Min,
  IsArray,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ToBoolean } from 'src/common/decorators/to-boolean.decorator';

export class FilterProductDto {
  // pagination
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 12;

  // search
  @IsOptional()
  @IsString()
  search?: string;

  // filters
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @IsOptional()
  @IsBoolean()
  @ToBoolean()
  inStock?: boolean;

  // ── variant filters ─────────────────────────────
  @IsString()
  @IsOptional()
  variantName?: string; // e.g. "Color" or "Size"

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  @IsArray()
  @IsString({ each: true })
  variantValues?: string[]; // e.g. ["Red", "Blue"] or ["S", "M", "L"]

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  @IsArray()
  @IsString({ each: true })
  colors?: string[]; // hex colors e.g. ["#FF0000", "#0000FF"]

  // sorting
  @IsOptional()
  @IsString()
  sortBy?: 'price' | 'createdAt' | 'name' = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';

  // ── rating filter ────────────────────────────────
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minRating?: number;

  // ── category slug (alternative to categoryId) ───
  @IsString()
  @IsOptional()
  categorySlug?: string;

  // ── active status ────────────────────────────────
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  status?: boolean;
}
