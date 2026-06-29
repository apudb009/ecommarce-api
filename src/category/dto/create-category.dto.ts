import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(4)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  slug!: string;

  @IsString()
  @IsOptional()
  image?: string;
}
