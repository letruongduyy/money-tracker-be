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
}

export const UserSchema = SchemaFactory.createForClass(User);
