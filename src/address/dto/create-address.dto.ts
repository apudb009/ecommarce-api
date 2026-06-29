import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  street!: string;
  @IsString()
  city!: string;
  @IsString()
  state!: string;
  @IsString()
  country!: string;
  @IsString()
  postalCode!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
