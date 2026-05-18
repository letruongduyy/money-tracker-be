import { IsNumber, IsEnum, IsString, IsOptional } from 'class-validator';
import { AssetType } from '../schemas/asset.schema';

export class CreateAssetDto {
  @IsOptional()
  @IsString()
  localId?: string;

  @IsEnum(AssetType, { message: 'Type must be cash, gold, or currency' })
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
}
