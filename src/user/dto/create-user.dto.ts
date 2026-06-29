import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsStrongPassword,
} from 'class-validator';
import { Role } from 'src/generated/prisma/enums';

export class CreateUserDto {
  @IsEmail()
  email!: string;
  @IsNotEmpty()
  name!: string;
  @IsStrongPassword()
  password!: string;
  @IsOptional()
  @IsEnum(Role)
  role?: 'CUSTOMER' | 'ADMIN';
  @IsNotEmpty()
  username!: string;
}
