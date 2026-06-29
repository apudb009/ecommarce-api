import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsInt()
  @Type(() => Number)
  addressId!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
