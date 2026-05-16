import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AssetDocument = Asset & Document;

export enum AssetType {
  CASH = 'cash',
  GOLD = 'gold',
  CURRENCY = 'currency',
}

@Schema({ timestamps: true })
export class Asset {
  @Prop()
  localId?: string;

  @Prop({ required: true, enum: AssetType })
  type: AssetType;

  @Prop({ required: true })
  name: string; // 'SJC', 'USD', 'Bank'

  @Prop({ required: true })
  amount: number;

  @Prop()
  symbol?: string; // 'USD', 'SJC'

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;
}

export const AssetSchema = SchemaFactory.createForClass(Asset);
