import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type DebtDocument = Debt & Document;

@Schema({ timestamps: true })
export class Debt {
  @Prop()
  localId?: string;

  @Prop({ required: true })
  type: string; // 'debt' or 'loan'

  @Prop({ required: true })
  personName: string;

  @Prop({ required: true })
  amount: number;

  @Prop()
  interestRate?: number;

  @Prop({ required: true })
  startDate: Date;

  @Prop()
  dueDate?: Date;

  @Prop()
  note?: string;

  @Prop({ default: false })
  isPaid: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;
}

export const DebtSchema = SchemaFactory.createForClass(Debt);
