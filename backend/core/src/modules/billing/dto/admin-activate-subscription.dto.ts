import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AdminActivateSubscriptionDto {
  @IsString()
  userId: string;

  @IsString()
  @IsIn(['free', 'pro', 'master'])
  plan: 'free' | 'pro' | 'master';

  @IsOptional()
  @IsInt()
  @Min(1)
  months?: number;
}

