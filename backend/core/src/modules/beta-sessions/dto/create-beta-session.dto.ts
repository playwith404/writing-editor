import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBetaSessionDto {
  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

