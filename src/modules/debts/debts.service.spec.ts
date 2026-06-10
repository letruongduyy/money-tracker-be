import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { getQueueToken } from '@nestjs/bullmq';
import { DebtsService } from './debts.service';
import { Debt } from './schemas/debt.schema';
import { Types } from 'mongoose';

describe('DebtsService', () => {
  let service: DebtsService;
  let mockDebtModel: any;
  let mockDebtQueue: any;

  beforeEach(async () => {
    // Mock save function on instances
    mockDebtModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
      save: jest.fn().mockResolvedValue({
        ...dto,
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
      }),
    }));

    mockDebtModel.findOneAndUpdate = jest.fn();
    mockDebtModel.find = jest.fn();
    mockDebtModel.findOne = jest.fn();
    mockDebtModel.findById = jest.fn();
    mockDebtModel.deleteOne = jest.fn();

    mockDebtQueue = {
      add: jest.fn().mockResolvedValue(null),
      getJob: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DebtsService,
        {
          provide: getModelToken(Debt.name),
          useValue: mockDebtModel,
        },
        {
          provide: getQueueToken('debt-reminder'),
          useValue: mockDebtQueue,
        },
      ],
    }).compile();

    service = module.get<DebtsService>(DebtsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should save debt and schedule reminder if dueDate is provided', async () => {
      const createDto = {
        personName: 'Duy',
        amount: 500000,
        type: 'loan' as const,
        dueDate: '2026-06-15T00:00:00.000Z',
        isPaid: false,
      };

      const result = await service.create(createDto, '507f1f77bcf86cd799439012');

      expect(result).toBeDefined();
      expect(mockDebtQueue.getJob).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockDebtQueue.add).toHaveBeenCalled();
    });
  });

  describe('scheduleReminder', () => {
    it('should not schedule if debt is paid', async () => {
      const debt = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        isPaid: true,
        dueDate: new Date('2026-06-15T00:00:00.000Z'),
      };

      await service.scheduleReminder(debt);

      expect(mockDebtQueue.add).not.toHaveBeenCalled();
      expect(mockDebtQueue.getJob).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should not schedule if debt has no dueDate', async () => {
      const debt = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        isPaid: false,
        dueDate: null,
      };

      await service.scheduleReminder(debt);

      expect(mockDebtQueue.add).not.toHaveBeenCalled();
      expect(mockDebtQueue.getJob).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should schedule reminder for unpaid debt with dueDate', async () => {
      const debt = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        isPaid: false,
        dueDate: new Date('2026-06-15T00:00:00.000Z'),
      };

      await service.scheduleReminder(debt);

      expect(mockDebtQueue.getJob).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockDebtQueue.add).toHaveBeenCalledWith(
        'send-due-reminder',
        { debtId: '507f1f77bcf86cd799439011' },
        expect.objectContaining({
          jobId: '507f1f77bcf86cd799439011',
          removeOnComplete: true,
          removeOnFail: true,
        }),
      );
    });
  });

  describe('cancelReminder', () => {
    it('should cancel the job if it exists in the queue', async () => {
      const mockJob = {
        remove: jest.fn().mockResolvedValue(null),
      };
      mockDebtQueue.getJob.mockResolvedValue(mockJob);

      await service.cancelReminder('507f1f77bcf86cd799439011');

      expect(mockDebtQueue.getJob).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockJob.remove).toHaveBeenCalled();
    });

    it('should do nothing if the job does not exist', async () => {
      mockDebtQueue.getJob.mockResolvedValue(null);

      await service.cancelReminder('507f1f77bcf86cd799439011');

      expect(mockDebtQueue.getJob).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });
  });
});
