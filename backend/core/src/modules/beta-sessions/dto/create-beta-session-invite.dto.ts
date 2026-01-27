import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateBetaSessionInviteDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  expiresInHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;
}

