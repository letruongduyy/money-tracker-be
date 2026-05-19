import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type NoteDocument = Note & Document;

@Schema({ timestamps: true })
export class Note {
  @Prop()
  localId?: string;

  @Prop({ default: '' })
  title: string;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  content: any;

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
