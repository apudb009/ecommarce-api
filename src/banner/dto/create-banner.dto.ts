import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateBannerDto {
  @IsString()
  @MinLength(4)
  title!: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  subtitle?: string;

  @IsString()
  image!: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  position: number = 0;
}
