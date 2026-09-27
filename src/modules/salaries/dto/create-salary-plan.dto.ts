import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SalaryAllocationDto {
  @IsOptional()
  @IsString()
  localId?: string;

  @IsString()
  title: string;

  @IsString()
  type: string; // 'expense', 'savings', 'investment'

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  targetAssetId?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  isExecuted?: boolean;

  @IsOptional()
  @IsNumber()
  orderIndex?: number;
}

export class CreateSalaryPlanDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  localId?: string;

  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  year: number;

  @IsNumber()
  incomeAmount: number;

  @IsOptional()
  @IsString()
  status?: string; // 'draft' or 'confirmed'

  @IsOptional()
  @IsDateString()
  confirmedAt?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalaryAllocationDto)
  allocations?: SalaryAllocationDto[];
}
