import { IsString, IsNumber, IsBoolean, IsOptional, IsIn } from 'class-validator';

export class UpdateVersionDto {
  @IsString()
  @IsIn(['android', 'ios'])
  platform: string;

  @IsString()
  latestVersion: string;

  @IsNumber()
  latestBuildNumber: number;

  @IsOptional()
  @IsBoolean()
  forceUpdate?: boolean;

  @IsString()
  downloadUrl: string;

  @IsOptional()
  @IsString()
  releaseNotes?: string;
}
