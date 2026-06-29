import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateCartDto {
  @IsInt()
  @Type(() => Number)
  productId!: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number = 1;
}
