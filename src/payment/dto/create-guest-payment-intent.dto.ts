import { Type } from 'class-transformer';
import { IsEmail, IsInt, Min } from 'class-validator';

export class CreateGuestPaymentIntentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId!: number;

  @IsEmail()
  email!: string;
}
