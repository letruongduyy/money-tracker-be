import { IsString, IsNumber, IsBoolean, IsDateString, IsOptional, IsIn, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DebtItemDto {
  @IsString()
  id: string;

  @IsString()
  @IsIn(['cash', 'gold', 'currency'])
  assetType: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  assetSymbol?: string;

  @IsOptional()
  @IsString()
  assetUnit?: string;
}

export class DebtPaymentDto {
  @IsString()
  id: string;

  @IsString()
  @IsIn(['cash', 'gold', 'currency'])
  assetType: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  assetSymbol?: string;

  @IsOptional()
  @IsString()
  assetUnit?: string;

  @IsDateString()
  paymentDate: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateDebtDto {
  @IsOptional()
  @IsString()
  localId?: string;

  @IsString()
  @IsIn(['debt', 'loan'])
  type: string;

  @IsString()
  personName: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebtItemDto)
  items: DebtItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebtPaymentDto)
  payments?: DebtPaymentDto[];

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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebtItemDto)
  items?: DebtItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebtPaymentDto)
  payments?: DebtPaymentDto[];

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
}
