import { IsNumber, IsString, IsOptional, Min, Max, IsIn, IsNotEmpty } from 'class-validator';

export class CreateFeedbackDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsIn(['bug', 'suggestion', 'question'])
  category?: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsOptional()
  @IsString()
  platform?: string;
}
