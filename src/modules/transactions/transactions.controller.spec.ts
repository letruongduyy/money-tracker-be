import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { BadRequestException } from '@nestjs/common';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let mockTransactionsService: any;

  beforeEach(async () => {
    mockTransactionsService = {
      getAnalyticsForPeriod: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAnalytics', () => {
    it('should successfully get analytics for a valid period', async () => {
      const mockResult = {
        totalIncome: 1000,
        totalExpense: 400,
        net: 600,
        txCount: 4,
        expenseByCategory: {},
        startDate: new Date(),
        endDate: new Date(),
      };
      mockTransactionsService.getAnalyticsForPeriod.mockResolvedValue(mockResult);

      const req = { user: { userId: 'user-123' } };
      const result = await controller.getAnalytics(req, 'weekly', '2026-05-21T10:00:00.000Z');

      expect(mockTransactionsService.getAnalyticsForPeriod).toHaveBeenCalledWith(
        'user-123',
        'weekly',
        expect.any(Date),
      );
      expect(result).toBe(mockResult);
    });

    it('should call getAnalyticsForPeriod with current date if no date query param is provided', async () => {
      mockTransactionsService.getAnalyticsForPeriod.mockResolvedValue({});
      const req = { user: { userId: 'user-123' } };
      
      await controller.getAnalytics(req, 'daily');
      
      expect(mockTransactionsService.getAnalyticsForPeriod).toHaveBeenCalledWith(
        'user-123',
        'daily',
        expect.any(Date),
      );
    });

    it('should throw BadRequestException if period is invalid', () => {
      const req = { user: { userId: 'user-123' } };
      expect(() =>
        controller.getAnalytics(req, 'yearly' as any),
      ).toThrow(BadRequestException);
    });
  });
});
