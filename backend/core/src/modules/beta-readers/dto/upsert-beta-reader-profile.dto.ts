import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertBetaReaderProfileDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  preferredGenres?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  readingVolume?: number;

  @IsOptional()
  @IsString()
  feedbackStyle?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

