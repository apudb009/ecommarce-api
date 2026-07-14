import { Type } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { ReturnReason } from 'src/generated/prisma/enums';

export class CreateReturnRequestDto {
  @IsOptional()
  @Type(() => String)
  details?: string;

  @IsEnum(ReturnReason)
  reason!: ReturnReason;
}
