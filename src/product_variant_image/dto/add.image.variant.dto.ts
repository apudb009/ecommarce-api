import { IsArray, IsString, IsNumber } from 'class-validator';

export class AddImageVariantDto {
  @IsArray()
  @IsString({ each: true })
  url!: string[];

  @IsNumber()
  variantId!: number;
}
