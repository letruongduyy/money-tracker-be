import { Test, TestingModule } from '@nestjs/testing';
import { DebtReminderProcessor } from './debt-reminder.processor';
import { DebtsService } from './debts.service';
import { PushService } from '../push/push.service';
import { Job } from 'bullmq';
import { Types } from 'mongoose';

describe('DebtReminderProcessor', () => {
  let processor: DebtReminderProcessor;
  let mockDebtsService: any;
  let mockPushService: any;

  beforeEach(async () => {
    mockDebtsService = {
      findOneByIdRaw: jest.fn(),
    };

    mockPushService = {
      sendToUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DebtReminderProcessor,
        {
          provide: DebtsService,
          useValue: mockDebtsService,
        },
        {
          provide: PushService,
          useValue: mockPushService,
        },
      ],
    }).compile();

    processor = module.get<DebtReminderProcessor>(DebtReminderProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should skip if debt is not found', async () => {
      mockDebtsService.findOneByIdRaw.mockResolvedValue(null);

      const mockJob = {
        data: { debtId: '507f1f77bcf86cd799439011' },
      } as Job;

      await processor.process(mockJob);

      expect(mockDebtsService.findOneByIdRaw).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockPushService.sendToUser).not.toHaveBeenCalled();
    });

    it('should skip if debt is already paid', async () => {
      const mockDebt = {
        _id: '507f1f77bcf86cd799439011',
        isPaid: true,
        user: new Types.ObjectId(),
        type: 'loan',
        personName: 'Duy',
      };
      mockDebtsService.findOneByIdRaw.mockResolvedValue(mockDebt);

      const mockJob = {
        data: { debtId: '507f1f77bcf86cd799439011' },
      } as Job;

      await processor.process(mockJob);

      expect(mockDebtsService.findOneByIdRaw).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockPushService.sendToUser).not.toHaveBeenCalled();
    });

    it('should send push notification for unpaid loan debt', async () => {
      const userId = new Types.ObjectId();
      const mockDebt = {
        _id: '507f1f77bcf86cd799439011',
        isPaid: false,
        user: userId,
        type: 'loan',
        personName: 'Duy',
      };
      mockDebtsService.findOneByIdRaw.mockResolvedValue(mockDebt);

      const mockJob = {
        data: { debtId: '507f1f77bcf86cd799439011' },
      } as Job;

      await processor.process(mockJob);

      expect(mockDebtsService.findOneByIdRaw).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockPushService.sendToUser).toHaveBeenCalledWith(userId.toString(), {
        title: 'Nhắc nhở thu nợ 💸',
        body: 'Hôm nay đến hạn thu hồi khoản cho vay của Duy! Đừng quên liên hệ lấy tiền nhé 💸',
        data: {
          type: 'debt_reminder',
          debtId: '507f1f77bcf86cd799439011',
        },
      });
    });

    it('should send push notification for unpaid debt (borrowed)', async () => {
      const userId = new Types.ObjectId();
      const mockDebt = {
        _id: '507f1f77bcf86cd799439011',
        isPaid: false,
        user: userId,
        type: 'debt',
        personName: 'Duy',
      };
      mockDebtsService.findOneByIdRaw.mockResolvedValue(mockDebt);

      const mockJob = {
        data: { debtId: '507f1f77bcf86cd799439011' },
      } as Job;

      await processor.process(mockJob);

      expect(mockDebtsService.findOneByIdRaw).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockPushService.sendToUser).toHaveBeenCalledWith(userId.toString(), {
        title: 'Nhắc nhở trả nợ ⏰',
        body: 'Hôm nay đến hạn trả nợ cho Duy! Bạn nhớ sắp xếp thanh toán nhé ⏰',
        data: {
          type: 'debt_reminder',
          debtId: '507f1f77bcf86cd799439011',
        },
      });
    });
  });
});
