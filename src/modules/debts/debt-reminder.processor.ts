import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DebtsService } from './debts.service';
import { PushService } from '../push/push.service';

@Processor('debt-reminder')
export class DebtReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(DebtReminderProcessor.name);

  constructor(
    private readonly debtsService: DebtsService,
    private readonly pushService: PushService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    try {
      const { debtId } = job.data;
      this.logger.log(`Processing due date reminder for debt ${debtId}`);

      // 1. Fetch debt details
      const debt = await this.debtsService.findOneByIdRaw(debtId);
      if (!debt) {
        this.logger.warn(`Debt ${debtId} not found, skipping reminder`);
        return;
      }

      // 2. Check if the debt has already been paid off
      if (debt.isPaid) {
        this.logger.log(`Debt ${debtId} is already paid off, skipping reminder`);
        return;
      }

      // 3. Send FCM Push Notification
      const userId = String(debt.user);
      const isLoan = debt.type === 'loan';
      const personName = debt.personName || 'ai đó';

      const title = isLoan ? 'Nhắc nhở thu nợ 💸' : 'Nhắc nhở trả nợ ⏰';
      const body = isLoan
        ? `Hôm nay đến hạn thu hồi khoản cho vay của ${personName}! Đừng quên liên hệ lấy tiền nhé 💸`
        : `Hôm nay đến hạn trả nợ cho ${personName}! Bạn nhớ sắp xếp thanh toán nhé ⏰`;

      this.logger.log(`Sending push notification to user ${userId} for debt ${debtId}`);

      await this.pushService.sendToUser(userId, {
        title,
        body,
        data: {
          type: 'debt_reminder',
          debtId: debtId,
        },
      });

      this.logger.log(`Successfully sent push reminder for debt ${debtId}`);
    } catch (error) {
      this.logger.error(`Failed to process debt reminder job ${job.id}`, error);
      throw error;
    }
  }
}
