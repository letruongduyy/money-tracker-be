import { Test, TestingModule } from '@nestjs/testing';
import { WeeklyReportController } from './weekly-report.controller';
import { WeeklyReportService } from './weekly-report.service';

describe('WeeklyReportController', () => {
  let controller: WeeklyReportController;
  let mockWeeklyReportService: any;

  beforeEach(async () => {
    mockWeeklyReportService = {
      sendWeeklyReports: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WeeklyReportController],
      providers: [
        {
          provide: WeeklyReportService,
          useValue: mockWeeklyReportService,
        },
      ],
    }).compile();

    controller = module.get<WeeklyReportController>(WeeklyReportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('triggerReport', () => {
    it('should trigger sendWeeklyReports and return success', async () => {
      const result = await controller.triggerReport();
      expect(mockWeeklyReportService.sendWeeklyReports).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Weekly reports triggered successfully',
      });
    });
  });
});
