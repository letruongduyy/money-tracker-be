import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfigController } from './app-config.controller';
import { AppConfigService } from './app-config.service';
import { AppVersion, AppVersionSchema } from './schemas/app-version.schema';
import { NoteBackground, NoteBackgroundSchema } from './schemas/note-background.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AppVersion.name, schema: AppVersionSchema },
      { name: NoteBackground.name, schema: NoteBackgroundSchema },
    ]),
  ],
  controllers: [AppConfigController],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
