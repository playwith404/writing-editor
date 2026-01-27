import { IsIn, IsOptional, IsString } from 'class-validator';

export class SubscribeDto {
  @IsString()
  @IsIn(['free', 'pro', 'master'])
  plan: 'free' | 'pro' | 'master';

  @IsOptional()
  months?: number;
}

