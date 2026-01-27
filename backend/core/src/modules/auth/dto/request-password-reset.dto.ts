import { IsEmail, IsString } from 'class-validator';

export class RequestPasswordResetDto {
  @IsEmail()
  @IsString()
  email: string;
}

