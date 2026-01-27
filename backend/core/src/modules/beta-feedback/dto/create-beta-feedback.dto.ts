import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateBetaFeedbackDto {
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  immersionRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  pacingRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  characterRating?: number;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @IsOptional()
  @IsString()
  comment?: string;
}

