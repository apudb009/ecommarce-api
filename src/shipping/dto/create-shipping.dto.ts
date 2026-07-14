import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateShippingDto {
  @IsString()
  name!: string;

  @IsNumber()
  @Type(() => Number)
  price!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
