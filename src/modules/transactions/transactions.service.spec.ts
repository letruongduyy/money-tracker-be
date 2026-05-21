import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TransactionsService } from './transactions.service';
import { Transaction } from './schemas/transaction.schema';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let mockTransactionModel: any;

  beforeEach(async () => {
    mockTransactionModel = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getModelToken(Transaction.name),
          useValue: mockTransactionModel,
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
});
