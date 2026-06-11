import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NoteBackgroundDocument = NoteBackground & Document;

@Schema({ timestamps: true })
export class NoteBackground {
  @Prop({ required: true, unique: true })
  url: string;
}

export const NoteBackgroundSchema = SchemaFactory.createForClass(NoteBackground);
