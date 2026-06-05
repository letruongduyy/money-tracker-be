import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TransactionType, PaymentMethod } from '../../transactions/schemas/transaction.schema';

export type RecurringTransactionDocument = RecurringTransaction & Document;

export enum RecurringFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

@Schema({ timestamps: true })
export class RecurringTransaction {
  @Prop()
  localId?: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, enum: TransactionType })
  type: TransactionType;

  @Prop({ required: true })
  category: string;

  @Prop()
  note?: string;

  @Prop({ required: true, enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Prop({ required: true, enum: RecurringFrequency })
  frequency: RecurringFrequency;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  nextExecutionDate: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;
}

export const RecurringTransactionSchema = SchemaFactory.createForClass(RecurringTransaction);
