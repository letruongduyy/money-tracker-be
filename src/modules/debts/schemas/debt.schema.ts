import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type DebtDocument = Debt & Document;

@Schema()
export class DebtItem {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  assetType: string; // 'cash', 'gold', 'currency'

  @Prop({ required: true })
  amount: number;

  @Prop()
  assetSymbol?: string;

  @Prop()
  assetUnit?: string;
}

const DebtItemSchema = SchemaFactory.createForClass(DebtItem);

@Schema()
export class DebtPayment {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  assetType: string;

  @Prop({ required: true })
  amount: number;

  @Prop()
  assetSymbol?: string;

  @Prop()
  assetUnit?: string;

  @Prop({ required: true })
  paymentDate: Date;

  @Prop()
  note?: string;
}

const DebtPaymentSchema = SchemaFactory.createForClass(DebtPayment);

@Schema({ timestamps: true })
export class Debt {
  @Prop()
  localId?: string;

  @Prop({ required: true })
  type: string; // 'debt' or 'loan'

  @Prop({ required: true })
  personName: string;

  @Prop({ type: [DebtItemSchema], default: [] })
  items: DebtItem[];

  @Prop({ type: [DebtPaymentSchema], default: [] })
  payments: DebtPayment[];

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
