import { IsBoolean, IsEmail, IsOptional } from 'class-validator';

export class CreateNewsletterDto {
  @IsEmail()
  email!: string;
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
