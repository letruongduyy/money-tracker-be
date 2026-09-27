import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SalaryPlanDocument = SalaryPlan & Document;

@Schema()
export class SalaryAllocationItem {
  @Prop({ required: true })
  localId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, default: 'expense' })
  type: string; // 'expense', 'savings', 'investment'

  @Prop({ required: true })
  amount: number;

  @Prop()
  targetAssetId?: string;

  @Prop()
  category?: string;

  @Prop({ default: false })
  isExecuted: boolean;

  @Prop({ default: 0 })
  orderIndex: number;
}

export const SalaryAllocationItemSchema = SchemaFactory.createForClass(SalaryAllocationItem);

@Schema({ timestamps: true })
export class SalaryPlan {
  @Prop()
  localId?: string;

  @Prop({ required: true })
  month: number;

  @Prop({ required: true })
  year: number;

  @Prop({ required: true })
  incomeAmount: number;

  @Prop({ required: true, default: 'draft' })
  status: string; // 'draft' or 'confirmed'

  @Prop()
  confirmedAt?: Date;

  @Prop()
  note?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: [SalaryAllocationItemSchema], default: [] })
  allocations: SalaryAllocationItem[];
}

export const SalaryPlanSchema = SchemaFactory.createForClass(SalaryPlan);

SalaryPlanSchema.index({ user: 1, month: 1, year: 1 }, { unique: true });
