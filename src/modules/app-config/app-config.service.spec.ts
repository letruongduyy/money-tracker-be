import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './app-config.service';
import { AppVersion } from './schemas/app-version.schema';

describe('AppConfigService', () => {
  let service: AppConfigService;
  let mockAppVersionModel: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockAppVersionModel = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppConfigService,
        {
          provide: getModelToken(AppVersion.name),
          useValue: mockAppVersionModel,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
  });

  describe('checkUpdate', () => {
    it('should return hasUpdate: true if current build is older than latest build', async () => {
      // Mock db returns latest version
      mockAppVersionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          platform: 'android',
          latestVersion: '1.0.5',
          latestBuildNumber: 6,
          forceUpdate: false,
          downloadUrl: 'https://play.google.com',
          releaseNotes: 'Some updates',
        }),
      });

      const result = await service.checkUpdate('android', '1.0.4', 5);

      expect(result.hasUpdate).toBe(true);
      expect(result.latestVersion).toBe('1.0.5');
      expect(result.latestBuildNumber).toBe(6);
    });

    it('should return hasUpdate: false if current build is equal or newer than latest build', async () => {
      mockAppVersionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          platform: 'android',
          latestVersion: '1.0.5',
          latestBuildNumber: 6,
          forceUpdate: false,
          downloadUrl: 'https://play.google.com',
          releaseNotes: 'Some updates',
        }),
      });

      const result = await service.checkUpdate('android', '1.0.5', 6);

      expect(result.hasUpdate).toBe(false);
    });

    it('should fall back to environment variables if no version config in db', async () => {
      mockAppVersionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'LATEST_ANDROID_VERSION') return '1.0.5';
        if (key === 'LATEST_ANDROID_BUILD') return '6';
        if (key === 'ANDROID_DOWNLOAD_URL') return 'https://play.google.com';
        if (key === 'UPDATE_FORCE') return 'true';
        if (key === 'UPDATE_RELEASE_NOTES') return 'Env notes';
        return null;
      });

      const result = await service.checkUpdate('android', '1.0.4', 5);

      expect(result.hasUpdate).toBe(true);
      expect(result.latestVersion).toBe('1.0.5');
      expect(result.latestBuildNumber).toBe(6);
      expect(result.forceUpdate).toBe(true);
      expect(result.releaseNotes).toBe('Env notes');
    });
  });
});
