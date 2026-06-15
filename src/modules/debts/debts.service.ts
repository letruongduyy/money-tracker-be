import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { Debt, DebtDocument } from './schemas/debt.schema';
import { CreateDebtDto } from './dto/debt.dto';
import { PushService } from '../push/push.service';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class DebtsService {
  private readonly logger = new Logger(DebtsService.name);

  constructor(
    @InjectModel(Debt.name)
    private debtModel: Model<DebtDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private readonly pushService: PushService,
  ) {}

  async create(createDto: CreateDebtDto, userId: string): Promise<Debt> {
    try {
      const created = new this.debtModel({
        ...createDto,
        user: new Types.ObjectId(userId),
      });
      return created.save();
    } catch (error) {
      this.logger.error('Failed to create debt/loan', error as Error);
      throw error;
    }
  }

  async update(
    id: string,
    updateDto: Partial<CreateDebtDto>,
    userId: string,
  ): Promise<Debt> {
    try {
      const updateData = { ...updateDto };

      if (Types.ObjectId.isValid(id)) {
        const updated = await this.debtModel
          .findOneAndUpdate(
            { _id: new Types.ObjectId(id), user: new Types.ObjectId(userId) },
            { $set: updateData },
            { returnDocument: 'after' },
          )
          .exec();

        if (updated) return updated;

        this.logger.warn(
          `Debt ${id} not found for user ${userId} — creating a new one instead`,
        );
      } else {
        this.logger.warn(`Invalid ObjectId "${id}" — creating a new debt instead`);
      }

      // Fallback: create new
      const created = new this.debtModel({
        ...updateData,
        user: new Types.ObjectId(userId),
      });
      return created.save();
    } catch (error) {
      this.logger.error(`Failed to update debt ${id}`, error as Error);
      throw error;
    }
  }

  async findAll(userId: string): Promise<Debt[]> {
    try {
      return this.debtModel
        .find({ user: new Types.ObjectId(userId) })
        .sort({ updatedAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error(`Failed to find debts for user ${userId}`, error as Error);
      throw error;
    }
  }

  async findOne(id: string, userId: string): Promise<Debt> {
    try {
      const debt = await this.debtModel
        .findOne({ _id: new Types.ObjectId(id), user: new Types.ObjectId(userId) })
        .exec();
      if (!debt) throw new NotFoundException('Debt not found');
      return debt;
    } catch (error) {
      this.logger.error(`Failed to find debt ${id}`, error as Error);
      throw error;
    }
  }

  async findOneByIdRaw(id: string): Promise<Debt | null> {
    try {
      if (!Types.ObjectId.isValid(id)) return null;
      return this.debtModel.findById(new Types.ObjectId(id)).exec();
    } catch (error) {
      this.logger.error(`Failed to find debt raw ${id}`, error as Error);
      return null;
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      const result = await this.debtModel
        .deleteOne({ _id: new Types.ObjectId(id), user: new Types.ObjectId(userId) })
        .exec();
      if (result.deletedCount === 0) throw new NotFoundException('Debt not found');
    } catch (error) {
      this.logger.error(`Failed to remove debt ${id}`, error as Error);
      throw error;
    }
  }

  /**
   * Runs every hour. Sends debt due reminders to users
   * whose notificationHour matches the current Vietnam local hour.
   */
  @Cron('0 * * * *', { name: 'debt-due-reminder' })
  async checkDebtDueReminders() {
    const vnHour = (new Date().getUTCHours() + 7) % 24;
    this.logger.log(`⏰ Debt due reminder check — Vietnam hour: ${vnHour}`);
    try {
      // Today range in UTC (accounting for UTC+7)
      const now = new Date();
      const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      const vnYear = vnNow.getUTCFullYear();
      const vnMonth = vnNow.getUTCMonth();
      const vnDay = vnNow.getUTCDate();
      const todayStartUTC = new Date(Date.UTC(vnYear, vnMonth, vnDay, -7, 0, 0));
      const todayEndUTC = new Date(Date.UTC(vnYear, vnMonth, vnDay, 17, 0, 0) - 1);

      // Find debts due today
      const dueTodayDebts = await this.debtModel
        .find({
          isPaid: false,
          dueDate: { $gte: todayStartUTC, $lte: todayEndUTC },
        })
        .exec();

      if (dueTodayDebts.length === 0) return;
      this.logger.log(`Found ${dueTodayDebts.length} debt(s) due today.`);

      let success = 0;
      let failed = 0;

      for (const debt of dueTodayDebts) {
        try {
          const userId = String(debt.user);

          // Check if this user's notificationHour matches current VN hour
          const user = await this.userModel
            .findById(userId)
            .select('notificationHour')
            .lean();
          const userHour = user?.notificationHour ?? 23;
          if (userHour !== vnHour) continue;

          const isLoan = debt.type === 'loan';
          const personName = debt.personName || 'ai đó';
          const title = isLoan ? 'Nhắc nhở thu nợ 💸' : 'Nhắc nhở trả nợ ⏰';
          const body = isLoan
            ? `Hôm nay đến hạn thu hồi khoản cho vay của ${personName}! Đừng quên liên hệ lấy tiền nhé 💸`
            : `Hôm nay đến hạn trả nợ cho ${personName}! Bạn nhớ sắp xếp thanh toán nhé ⏰`;

          const result = await this.pushService.sendToUser(userId, {
            title,
            body,
            data: { type: 'debt_reminder', debtId: String(debt._id) },
          });

          if (result.success) success++;
          else failed++;
        } catch (err: any) {
          this.logger.error(`Failed to send reminder for debt ${debt._id}: ${err?.message}`);
          failed++;
        }
      }

      this.logger.log(`Debt reminders done — ✅ ${success} succeeded, ❌ ${failed} failed`);
    } catch (error) {
      this.logger.error('Error checking debt due reminders', error);
    }
  }
}
