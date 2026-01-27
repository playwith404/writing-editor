import { IsString } from 'class-validator';

export class AdminCancelSubscriptionDto {
  @IsString()
  userId: string;
}

