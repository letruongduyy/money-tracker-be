import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NoteDocument = Note & Document;

@Schema({ timestamps: true })
export class Note {
  @Prop()
  localId?: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  content: string;

  @Prop({ default: false })
  isList: boolean;

  @Prop({ default: false })
  isPinned: boolean;

  @Prop()
  bgImage?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;
}

export const NoteSchema = SchemaFactory.createForClass(Note);
