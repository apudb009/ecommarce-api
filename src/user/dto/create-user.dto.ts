import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;
  @IsNotEmpty()
  name!: string;
  @IsStrongPassword()
  password!: string;
  @IsOptional()
  @IsString()
  role?: string;
  @IsNotEmpty()
  username!: string;
}
