import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  avatar: string;

  @Prop({ default: '' })
  fcmToken: string;

  @Prop({ default: 23, min: 0, max: 23 })
  notificationHour: number; // Vietnam local hour (0–23), default 11 PM

  @Prop({ default: 0, min: 0, max: 59 })
  notificationMinute: number; // Vietnam local minute (0–59), default 0

  @Prop({ default: '' })
  lastDailyReminderDate: string; // YYYY-MM-DD to prevent duplicate daily reminder pushes

  @Prop({ default: '' })
  lastDailyReportDate: string; // YYYY-MM-DD to prevent duplicate daily report pushes

  @Prop({ default: true })
  budgetAlertsEnabled: boolean; // Push alerts when spending reaches 80%/100% of a budget
}

export const UserSchema = SchemaFactory.createForClass(User);

// Index for high-performance cron query every minute
UserSchema.index({ fcmToken: 1, notificationHour: 1, notificationMinute: 1 });
