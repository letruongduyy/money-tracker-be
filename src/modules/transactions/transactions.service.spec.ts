import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TransactionsService } from './transactions.service';
import { Transaction } from './schemas/transaction.schema';
import { BudgetsService } from '../budgets/budgets.service';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let mockTransactionModel: any;

  beforeEach(async () => {
    mockTransactionModel = {
      find: jest.fn(),
    };

    const mockBudgetsService = {
      checkBudgetAndNotify: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getModelToken(Transaction.name),
          useValue: mockTransactionModel,
        },
        {
          provide: BudgetsService,
          useValue: mockBudgetsService,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  describe('getStartOfWeek (private)', () => {
    it('should correctly find Monday 00:00:00 for a Monday', () => {
      // 2026-05-18 is a Monday
      const date = new Date('2026-05-18T15:30:00.000Z');
      const start = service['getStartOfWeek'](date);
      expect(start.toISOString().split('T')[0]).toBe('2026-05-18');
      expect(start.getUTCHours()).toBe(0);
      expect(start.getUTCMinutes()).toBe(0);
      expect(start.getUTCSeconds()).toBe(0);
    });

    it('should correctly find Monday 00:00:00 for a Wednesday', () => {
      // 2026-05-20 is a Wednesday
      const date = new Date('2026-05-20T10:15:00.000Z');
      const start = service['getStartOfWeek'](date);
      expect(start.toISOString().split('T')[0]).toBe('2026-05-18');
    });

    it('should correctly find Monday 00:00:00 for a Sunday', () => {
      // 2026-05-24 is a Sunday
      const date = new Date('2026-05-24T23:59:59.000Z');
      const start = service['getStartOfWeek'](date);
      expect(start.toISOString().split('T')[0]).toBe('2026-05-18');
    });
  });

  describe('getWeeklyTransactions', () => {
    it('should fetch transactions and group them by week start with summaries', async () => {
      const mockTransactions = [
        {
          _id: '1',
          amount: 100,
          type: 'income',
          category: 'salary',
          date: new Date('2026-05-20T12:00:00.000Z'), // Week: 2026-05-18 to 2026-05-24
        },
        {
          _id: '2',
          amount: 50,
          type: 'expense',
          category: 'food',
          date: new Date('2026-05-19T18:00:00.000Z'), // Week: 2026-05-18 to 2026-05-24
        },
        {
          _id: '3',
          amount: 30,
          type: 'expense',
          category: 'transport',
          date: new Date('2026-05-11T09:00:00.000Z'), // Week: 2026-05-11 to 2026-05-17
        },
      ];

      // mock transactionModel.find().sort() chaining
      const mockSort = jest.fn().mockResolvedValue(mockTransactions);
      mockTransactionModel.find.mockReturnValue({
        sort: mockSort,
      });

      const result = await service.getWeeklyTransactions('userId', 5, 2026);

      // Verify DB query
      expect(mockTransactionModel.find).toHaveBeenCalledWith({
        user: 'userId',
        date: {
          $gte: new Date(2026, 4, 1),
          $lte: new Date(2026, 5, 0, 23, 59, 59, 999),
        },
      });
      expect(mockSort).toHaveBeenCalledWith({ date: -1 });

      // Verify grouped output
      expect(result).toHaveLength(2);

      // Week 2026-05-18
      expect(result[0].weekStart).toBe('2026-05-18');
      expect(result[0].weekEnd).toBe('2026-05-24');
      expect(result[0].income).toBe(100);
      expect(result[0].expense).toBe(50);
      expect(result[0].balance).toBe(50);
      expect(result[0].transactions).toHaveLength(2);

      // Week 2026-05-11
      expect(result[1].weekStart).toBe('2026-05-11');
      expect(result[1].weekEnd).toBe('2026-05-17');
      expect(result[1].income).toBe(0);
      expect(result[1].expense).toBe(30);
      expect(result[1].balance).toBe(-30);
      expect(result[1].transactions).toHaveLength(1);
    });
  });

  describe('getWeeklyAnalytics', () => {
    it('should call aggregate with correct match and group pipelines', async () => {
      const mockAggregateResult = [
        { _id: { type: 'income', category: 'salary' }, total: 1000, count: 1 },
        { _id: { type: 'expense', category: 'food' }, total: 300, count: 2 },
        { _id: { type: 'expense', category: 'transport' }, total: 100, count: 1 },
      ];
      mockTransactionModel.aggregate = jest.fn().mockResolvedValue(mockAggregateResult);

      const from = new Date('2026-05-18T00:00:00.000Z');
      const to = new Date('2026-05-24T23:59:59.999Z');

      const result = await service.getWeeklyAnalytics('507f1f77bcf86cd799439011', from, to);

      expect(mockTransactionModel.aggregate).toHaveBeenCalledWith([
        {
          $match: {
            user: expect.any(Object),
            date: { $gte: from, $lte: to },
          },
        },
        {
          $group: {
            _id: { type: '$type', category: '$category' },
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]);

      expect(result).toEqual({
        totalIncome: 1000,
        totalExpense: 400,
        net: 600,
        txCount: 4,
        expenseByCategory: {
          food: 300,
          transport: 100,
        },
      });
    });
  });

  describe('getAnalyticsForPeriod', () => {
    let mockSort: jest.Mock;

    beforeEach(() => {
      mockSort = jest.fn().mockResolvedValue([
        { _id: '1', amount: 100, type: 'income', date: new Date() },
      ]);
      mockTransactionModel.find = jest.fn().mockReturnValue({
        sort: mockSort,
      });
    });

    it('should calculate correct dates for daily period and fetch from db', async () => {
      const date = new Date('2026-05-21T15:30:00.000Z');
      const result = await service.getAnalyticsForPeriod('userId', 'daily', date);

      expect(mockTransactionModel.find).toHaveBeenCalledWith({
        user: 'userId',
        date: {
          $gte: new Date('2026-05-21T00:00:00.000Z'),
          $lte: new Date('2026-05-21T23:59:59.999Z'),
        },
      });
      expect(mockSort).toHaveBeenCalledWith({ date: -1 });
      expect(result).toHaveLength(1);
    });

    it('should calculate correct dates for weekly period and fetch from db', async () => {
      const date = new Date('2026-05-21T10:00:00.000Z');
      await service.getAnalyticsForPeriod('userId', 'weekly', date);

      expect(mockTransactionModel.find).toHaveBeenCalledWith({
        user: 'userId',
        date: {
          $gte: new Date('2026-05-18T00:00:00.000Z'),
          $lte: new Date('2026-05-24T23:59:59.999Z'),
        },
      });
    });

    it('should calculate correct dates for monthly period and fetch from db', async () => {
      const date = new Date('2026-05-21T10:00:00.000Z');
      await service.getAnalyticsForPeriod('userId', 'monthly', date);

      expect(mockTransactionModel.find).toHaveBeenCalledWith({
        user: 'userId',
        date: {
          $gte: new Date('2026-05-01T00:00:00.000Z'),
          $lte: new Date('2026-05-31T23:59:59.999Z'),
        },
      });
    });
  });
});
