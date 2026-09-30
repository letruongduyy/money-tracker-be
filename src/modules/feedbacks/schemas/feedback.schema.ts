import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FeedbackDocument = Feedback & Document;

export const FeedbackCategories = ['bug', 'suggestion', 'question'] as const;
export type FeedbackCategory = (typeof FeedbackCategories)[number];

@Schema({ timestamps: true })
export class Feedback {
  @Prop({ required: true, index: true, ref: 'User' })
  user: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ required: true, enum: FeedbackCategories, default: 'suggestion' })
  category: FeedbackCategory;

  @Prop({ required: true })
  message: string;

  @Prop({ default: '' })
  appVersion: string;

  @Prop({ default: '' })
  platform: string;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
FeedbackSchema.index({ createdAt: -1 });
