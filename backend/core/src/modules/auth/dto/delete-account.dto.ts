import { IsOptional, IsString, MinLength } from 'class-validator';

export class DeleteAccountDto {
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

