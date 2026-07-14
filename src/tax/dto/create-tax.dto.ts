import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { TaxType } from 'src/generated/prisma/enums';

export class CreateTaxDto {
  @IsString()
  name!: string;

  @IsNumber()
  @Type(() => Number)
  rate: number = 0;

  @IsEnum(TaxType)
  type: TaxType = TaxType.PERCENTAGE;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = false;
}
