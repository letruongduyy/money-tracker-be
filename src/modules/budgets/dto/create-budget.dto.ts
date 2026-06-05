import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
  IsPositive,
} from 'class-validator';

export class CreateBudgetDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  localId?: string;

  @IsString()
  category: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  @IsPositive()
  year: number;
}
