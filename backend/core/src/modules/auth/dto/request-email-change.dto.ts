import { IsEmail, IsString } from 'class-validator';

export class RequestEmailChangeDto {
  @IsEmail()
  @IsString()
  newEmail: string;
}

