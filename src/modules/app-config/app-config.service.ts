import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { AppVersion, AppVersionDocument } from './schemas/app-version.schema';
import { UpdateVersionDto } from './dto/update-version.dto';

@Injectable()
export class AppConfigService {
  constructor(
    @InjectModel(AppVersion.name)
    private appVersionModel: Model<AppVersionDocument>,
    private configService: ConfigService,
  ) {}

  async getLatestVersion(platform: string): Promise<AppVersion> {
    const versionObj = await this.appVersionModel.findOne({ platform }).exec();
    if (versionObj) {
      return versionObj;
    }

    // Fallback to environment variables
    const isAndroid = platform === 'android';
    const defaultVersion = isAndroid
      ? this.configService.get<string>('LATEST_ANDROID_VERSION') || '1.0.0'
      : this.configService.get<string>('LATEST_IOS_VERSION') || '1.0.0';

    const defaultBuild = isAndroid
      ? parseInt(this.configService.get<string>('LATEST_ANDROID_BUILD') || '1', 10)
      : parseInt(this.configService.get<string>('LATEST_IOS_BUILD') || '1', 10);

    const defaultUrl = isAndroid
      ? this.configService.get<string>('ANDROID_DOWNLOAD_URL') || 'https://play.google.com/store/apps/details?id=com.moneytracker.prod'
      : this.configService.get<string>('IOS_DOWNLOAD_URL') || 'https://apps.apple.com/app/id123456789';

    const defaultForce = this.configService.get<string>('UPDATE_FORCE') === 'true';
    const defaultNotes = this.configService.get<string>('UPDATE_RELEASE_NOTES') || 'Cập nhật phiên bản mới nhất.';

    return {
      platform,
      latestVersion: defaultVersion,
      latestBuildNumber: defaultBuild,
      forceUpdate: defaultForce,
      downloadUrl: defaultUrl,
      releaseNotes: defaultNotes,
    } as AppVersion;
  }

  async updateLatestVersion(dto: UpdateVersionDto): Promise<AppVersion> {
    let versionObj = await this.appVersionModel.findOne({ platform: dto.platform }).exec();
    if (versionObj) {
      versionObj.latestVersion = dto.latestVersion;
      versionObj.latestBuildNumber = dto.latestBuildNumber;
      versionObj.forceUpdate = dto.forceUpdate ?? false;
      versionObj.downloadUrl = dto.downloadUrl;
      versionObj.releaseNotes = dto.releaseNotes ?? '';
      return versionObj.save();
    } else {
      versionObj = new this.appVersionModel({
        platform: dto.platform,
        latestVersion: dto.latestVersion,
        latestBuildNumber: dto.latestBuildNumber,
        forceUpdate: dto.forceUpdate ?? false,
        downloadUrl: dto.downloadUrl,
        releaseNotes: dto.releaseNotes ?? '',
      });
      return versionObj.save();
    }
  }

  async checkUpdate(
    platform: string,
    currentVersion: string,
    currentBuildNumber: number,
  ) {
    const latest = await this.getLatestVersion(platform);
    const hasUpdate = currentBuildNumber < latest.latestBuildNumber;

    return {
      hasUpdate,
      latestVersion: latest.latestVersion,
      latestBuildNumber: latest.latestBuildNumber,
      forceUpdate: latest.forceUpdate,
      downloadUrl: latest.downloadUrl,
      releaseNotes: latest.releaseNotes,
    };
  }
}
