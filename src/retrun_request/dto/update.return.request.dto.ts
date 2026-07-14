import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReturnStatus } from 'src/generated/prisma/enums';

export class UpdateReturnRequestDto {
  @IsEnum(ReturnStatus)
  status!: ReturnStatus;

  @IsOptional()
  @IsString()
  adminNote?: string;
}
