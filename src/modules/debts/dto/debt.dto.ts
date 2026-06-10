import { IsString, IsNumber, IsBoolean, IsDateString, IsOptional, IsIn } from 'class-validator';

export class CreateDebtDto {
  @IsOptional()
  @IsString()
  localId?: string;

  @IsString()
  @IsIn(['debt', 'loan'])
  type: string;

  @IsString()
  personName: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsNumber()
  interestRate?: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['cash', 'gold', 'currency'])
  assetType?: string;

  @IsOptional()
  @IsString()
  assetSymbol?: string;

  @IsOptional()
  @IsString()
  assetUnit?: string;
}

export class UpdateDebtDto {
  @IsOptional()
  @IsString()
  @IsIn(['debt', 'loan'])
  type?: string;

  @IsOptional()
  @IsString()
  personName?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  interestRate?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['cash', 'gold', 'currency'])
  assetType?: string;

  @IsOptional()
  @IsString()
  assetSymbol?: string;

  @IsOptional()
  @IsString()
  assetUnit?: string;
}
