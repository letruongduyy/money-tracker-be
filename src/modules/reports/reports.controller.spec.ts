import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

describe('ReportsController', () => {
  let controller: ReportsController;
  let mockReportsService: any;

  beforeEach(async () => {
    mockReportsService = {
      sendDailyReports: jest.fn().mockResolvedValue(undefined),
      sendWeeklyReports: jest.fn().mockResolvedValue(undefined),
      sendMonthlyReports: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: mockReportsService,
        },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('triggerDailyReport', () => {
    it('should trigger sendDailyReports and return success', async () => {
      const result = await controller.triggerDailyReport();
      expect(mockReportsService.sendDailyReports).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Daily reports triggered successfully',
      });
    });
  });

  describe('triggerWeeklyReport', () => {
    it('should trigger sendWeeklyReports and return success', async () => {
      const result = await controller.triggerWeeklyReport();
      expect(mockReportsService.sendWeeklyReports).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Weekly reports triggered successfully',
      });
    });
  });

  describe('triggerMonthlyReport', () => {
    it('should trigger sendMonthlyReports and return success', async () => {
      const result = await controller.triggerMonthlyReport();
      expect(mockReportsService.sendMonthlyReports).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Monthly reports triggered successfully',
      });
    });
  });
});
