import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AppVersionDocument = AppVersion & Document;

@Schema({ timestamps: true })
export class AppVersion {
  @Prop({ required: true, unique: true })
  platform: string; // 'android' or 'ios'

  @Prop({ required: true })
  latestVersion: string; // e.g. '1.0.5'

  @Prop({ required: true })
  latestBuildNumber: number; // e.g. 6

  @Prop({ default: false })
  forceUpdate: boolean;

  @Prop({ required: true })
  downloadUrl: string;

  @Prop({ default: '' })
  releaseNotes: string;
}

export const AppVersionSchema = SchemaFactory.createForClass(AppVersion);
