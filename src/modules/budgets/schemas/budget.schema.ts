import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BudgetDocument = Budget & Document;

@Schema({ timestamps: true })
export class Budget {
  @Prop()
  localId?: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  month: number;

  @Prop({ required: true })
  year: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ default: false })
  notified80: boolean;

  @Prop({ default: false })
  notified100: boolean;
}

export const BudgetSchema = SchemaFactory.createForClass(Budget);

// Compound unique index to prevent duplicate budgets for same user, category, month, and year
BudgetSchema.index({ user: 1, category: 1, month: 1, year: 1 }, { unique: true });
