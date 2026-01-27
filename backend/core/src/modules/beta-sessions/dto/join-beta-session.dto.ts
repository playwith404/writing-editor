import { IsString } from 'class-validator';

export class JoinBetaSessionDto {
  @IsString()
  token: string;
}

