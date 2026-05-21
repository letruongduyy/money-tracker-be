import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ReportsService } from './reports.service';
import { TransactionsService } from '../transactions/transactions.service';
import { PushService } from '../push/push.service';
import { User } from '../users/schemas/user.schema';

describe('ReportsService', () => {
  let service: ReportsService;
  let mockUserModel: any;
  let mockTransactionsService: any;
  let mockPushService: any;

  beforeEach(async () => {
    mockUserModel = {
      find: jest.fn(),
    };

    mockTransactionsService = {
      getWeeklyAnalytics: jest.fn(),
    };

    mockPushService = {
      sendToUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
        {
          provide: PushService,
          useValue: mockPushService,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  describe('Daily, Weekly, Monthly report generation', () => {
    const mockUsers = [
      { _id: 'user1', name: 'Alice', fcmToken: 'token1' },
    ];

    const mockAnalytics = {
      totalIncome: 1000000,
      totalExpense: 400000,
      net: 600000,
      txCount: 5,
      expenseByCategory: { food: 400000 },
    };

    beforeEach(() => {
      // Mock Mongoose model chaining: find().select().lean()
      const mockLean = jest.fn().mockResolvedValue(mockUsers);
      const mockSelect = jest.fn().mockReturnValue({ lean: mockLean });
      mockUserModel.find.mockReturnValue({ select: mockSelect });

      mockTransactionsService.getWeeklyAnalytics.mockResolvedValue(mockAnalytics);
      mockPushService.sendToUser.mockResolvedValue({ success: true });
    });

    it('should correctly format daily report message and parameters', async () => {
      await service.sendDailyReports();

      expect(mockUserModel.find).toHaveBeenCalledWith({
        fcmToken: { $exists: true, $ne: '' },
      });

      expect(mockTransactionsService.getWeeklyAnalytics).toHaveBeenCalled();
      expect(mockPushService.sendToUser).toHaveBeenCalledWith('user1', {
        title: '📊 Your Daily Report',
        body: 'Hi Alice! Today you saved 600.000₫ 🎉. Income: 1.000.000₫ · Expense: 400.000₫. Top spending: food.',
        data: {
          type: 'daily_report',
          totalIncome: '1000000',
          totalExpense: '400000',
          net: '600000',
          txCount: '5',
        },
      });
    });

    it('should correctly format weekly report message and parameters', async () => {
      await service.sendWeeklyReports();

      expect(mockPushService.sendToUser).toHaveBeenCalledWith('user1', {
        title: '📊 Your Weekly Report',
        body: 'Hi Alice! Last week you saved 600.000₫ 🎉. Income: 1.000.000₫ · Expense: 400.000₫. Top spending: food.',
        data: {
          type: 'weekly_report',
          totalIncome: '1000000',
          totalExpense: '400000',
          net: '600000',
          txCount: '5',
        },
      });
    });

    it('should correctly format monthly report message and parameters', async () => {
      await service.sendMonthlyReports();

      expect(mockPushService.sendToUser).toHaveBeenCalledWith('user1', {
        title: '📊 Your Monthly Report',
        body: 'Hi Alice! Last month you saved 600.000₫ 🎉. Income: 1.000.000₫ · Expense: 400.000₫. Top spending: food.',
        data: {
          type: 'monthly_report',
          totalIncome: '1000000',
          totalExpense: '400000',
          net: '600000',
          txCount: '5',
        },
      });
    });
  });
});
