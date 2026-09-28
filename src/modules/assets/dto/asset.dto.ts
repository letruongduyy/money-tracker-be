import { IsNumber, IsEnum, IsString, IsOptional, IsDateString } from 'class-validator';
import { AssetType } from '../schemas/asset.schema';

export class CreateAssetDto {
  @IsOptional()
  @IsString()
  localId?: string;

  @IsEnum(AssetType, { message: 'Type must be cash, gold, currency, or savings' })
  type: AssetType;

  @IsString()
  name: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @IsOptional()
  @IsNumber()
  termMonths?: number;

  @IsOptional()
  @IsNumber()
  interestRate?: number;
}

export class UpdateAssetDto {
  @IsOptional()
  @IsEnum(AssetType)
  type?: AssetType;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @IsOptional()
  @IsNumber()
  termMonths?: number;

  @IsOptional()
  @IsNumber()
  interestRate?: number;
}
