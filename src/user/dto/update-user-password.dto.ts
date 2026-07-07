import { IsString, IsStrongPassword } from 'class-validator';

export class UpdateUserPasswordDto {
  @IsString()
  currentPassword!: string;
  @IsStrongPassword()
  newPassword!: string;
}
