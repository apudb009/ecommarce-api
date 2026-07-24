import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from 'src/generated/prisma/enums';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsString()
  @IsOptional()
  trackingMessage?: string;

  @IsString()
  @IsOptional()
  location?: string;
}
