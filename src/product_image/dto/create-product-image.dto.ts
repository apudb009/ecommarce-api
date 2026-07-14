import { IsArray, IsNumber, IsString } from 'class-validator';

export class CreateProductImageDto {
  @IsArray()
  @IsString({ each: true })
  url!: string[];

  @IsNumber()
  productId!: number;
}
