import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @IsOptional()
  localId?: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  content?: string;

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
