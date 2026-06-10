import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Debt, DebtDocument } from './schemas/debt.schema';
import { CreateDebtDto } from './dto/debt.dto';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class DebtsService {
  private readonly logger = new Logger(DebtsService.name);

  constructor(
    @InjectModel(Debt.name)
    private debtModel: Model<DebtDocument>,
    @InjectQueue('debt-reminder')
    private readonly debtQueue: Queue,
  ) {}

  async create(createDto: CreateDebtDto, userId: string): Promise<Debt> {
    try {
      const created = new this.debtModel({
        ...createDto,
        user: new Types.ObjectId(userId),
      });
      const saved = await created.save();
      await this.scheduleReminder(saved);
      return saved;
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

        if (updated) {
          await this.scheduleReminder(updated);
          return updated;
        }

        this.logger.warn(
          `Debt ${id} not found for user ${userId} — creating a new one instead`,
        );
      } else {
        this.logger.warn(
          `Invalid ObjectId "${id}" — creating a new debt instead`,
        );
      }

      // Fallback: create a new debt with the provided data
      const created = new this.debtModel({
        ...updateData,
        user: new Types.ObjectId(userId),
      });
      const saved = await created.save();
      await this.scheduleReminder(saved);
      return saved;
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
      this.logger.error(
        `Failed to find debts for user ${userId}`,
        error as Error,
      );
      throw error;
    }
  }

  async findOne(id: string, userId: string): Promise<Debt> {
    try {
      const debt = await this.debtModel
        .findOne({
          _id: new Types.ObjectId(id),
          user: new Types.ObjectId(userId),
        })
        .exec();

      if (!debt) {
        throw new NotFoundException('Debt not found');
      }
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
        .deleteOne({
          _id: new Types.ObjectId(id),
          user: new Types.ObjectId(userId),
        })
        .exec();

      if (result.deletedCount === 0) {
        throw new NotFoundException('Debt not found');
      }
      await this.cancelReminder(id);
    } catch (error) {
      this.logger.error(`Failed to remove debt ${id}`, error as Error);
      throw error;
    }
  }

  async scheduleReminder(debt: any): Promise<void> {
    try {
      // Ensure any existing reminder job for this debt is canceled first
      await this.cancelReminder(debt._id.toString());

      if (debt.isPaid || !debt.dueDate) return;

      const dueDate = new Date(debt.dueDate);
      
      // Calculate target time: 8:00 AM on the due date in local time (UTC+7 / ICT)
      // 1. Get due date year, month, day
      const year = dueDate.getUTCFullYear();
      const month = dueDate.getUTCMonth();
      const day = dueDate.getUTCDate();
      
      // 2. Create local Date object in UTC+7 (which is 01:00 AM UTC)
      const targetTime = new Date(Date.UTC(year, month, day, 1, 0, 0)); // 1:00 AM UTC = 8:00 AM UTC+7

      const now = Date.now();
      const delay = Math.max(0, targetTime.getTime() - now);

      this.logger.log(
        `Scheduling reminder for debt ${debt._id} due on ${dueDate.toISOString()} with delay ${delay}ms (target: ${targetTime.toISOString()})`,
      );

      await this.debtQueue.add(
        'send-due-reminder',
        { debtId: debt._id.toString() },
        {
          delay,
          jobId: debt._id.toString(), // Ensures unique job per debt
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to schedule reminder for debt ${debt._id}`, error);
    }
  }

  async cancelReminder(debtId: string): Promise<void> {
    try {
      const job = await this.debtQueue.getJob(debtId);
      if (job) {
        this.logger.log(`Canceling existing reminder job for debt ${debtId}`);
        await job.remove();
      }
    } catch (error) {
      this.logger.error(`Failed to cancel reminder job for debt ${debtId}`, error);
    }
  }
}
