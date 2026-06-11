import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfigController } from './app-config.controller';
import { AppConfigService } from './app-config.service';
import { AppVersion, AppVersionSchema } from './schemas/app-version.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AppVersion.name, schema: AppVersionSchema },
    ]),
  ],
  controllers: [AppConfigController],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
