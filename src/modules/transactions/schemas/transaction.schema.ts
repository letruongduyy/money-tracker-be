import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Transaction & Document;

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  E_WALLET = 'e_wallet',
  BANK_TRANSFER = 'bank_transfer',
}

export const TransactionCategories = {
  [TransactionType.INCOME]: ['salary', 'freelance', 'gift', 'investment', 'other'],
  [TransactionType.EXPENSE]: [
    'food_and_dining',
    'transport',
    'shopping',
    'entertainment',
    'bills_and_utilities',
    'health',
    'education',
    'baby',
    'other',
  ],
};

const AllCategories = Array.from(
  new Set([
    ...TransactionCategories[TransactionType.INCOME],
    ...TransactionCategories[TransactionType.EXPENSE],
  ]),
);

@Schema({ timestamps: true })
export class Transaction {
  @Prop()
  localId?: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, enum: TransactionType })
  type: TransactionType;

  @Prop({ required: true, enum: AllCategories })
  category: string;

  @Prop()
  note?: string;

  @Prop({
    type: {
      lat: Number,
      lng: Number,
    },
  })
  location?: {
    lat: number;
    lng: number;
  };

  @Prop({ required: true, enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Prop({ default: Date.now })
  date: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
