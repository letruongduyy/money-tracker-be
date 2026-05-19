import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @IsOptional()
  localId?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsOptional()
  content?: any;

  @IsBoolean()
  @IsOptional()
  isList?: boolean;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @IsString()
  @IsOptional()
  bgImage?: string;
}
