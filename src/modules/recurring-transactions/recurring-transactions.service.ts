import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  RecurringTransaction,
  RecurringTransactionDocument,
  RecurringFrequency,
} from './schemas/recurring-transaction.schema';
import { CreateRecurringTransactionDto } from './dto/create-recurring-transaction.dto';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class RecurringTransactionsService {
  private readonly logger = new Logger(RecurringTransactionsService.name);

  constructor(
    @InjectModel(RecurringTransaction.name)
    private recurringModel: Model<RecurringTransactionDocument>,
    
    // Inject TransactionsService to insert standard transactions upon execution
    private transactionsService: TransactionsService,
  ) {}

  private calculateNextExecutionDate(startDate: Date, frequency: RecurringFrequency): Date {
    const now = new Date();
    const date = new Date(startDate);
    
    // If startDate is in the future, it is the first next execution date.
    if (date > now) {
      return date;
    }

    // Normalize to calendar day comparisons
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (startDay >= today) {
      return date;
    }

    // Advance to find the next future (or today) occurrence
    while (date < today) {
      switch (frequency) {
        case RecurringFrequency.DAILY:
          date.setDate(date.getDate() + 1);
          break;
        case RecurringFrequency.WEEKLY:
          date.setDate(date.getDate() + 7);
          break;
        case RecurringFrequency.MONTHLY:
          date.setMonth(date.getMonth() + 1);
          break;
        case RecurringFrequency.YEARLY:
          date.setFullYear(date.getFullYear() + 1);
          break;
        default:
          date.setMonth(date.getMonth() + 1);
      }
    }
    return date;
  }

  private advanceNextExecutionDate(currentDate: Date, frequency: RecurringFrequency): Date {
    const date = new Date(currentDate);
    switch (frequency) {
      case RecurringFrequency.DAILY:
        date.setDate(date.getDate() + 1);
        break;
      case RecurringFrequency.WEEKLY:
        date.setDate(date.getDate() + 7);
        break;
      case RecurringFrequency.MONTHLY:
        date.setMonth(date.getMonth() + 1);
        break;
      case RecurringFrequency.YEARLY:
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    return date;
  }

  async create(data: CreateRecurringTransactionDto, userId: string) {
    const startDate = new Date(data.startDate);
    const frequency = data.frequency;
    
    const nextExecutionDate = data.nextExecutionDate 
      ? new Date(data.nextExecutionDate)
      : this.calculateNextExecutionDate(startDate, frequency);

    return this.recurringModel.create({
      ...data,
      startDate,
      nextExecutionDate,
      user: new Types.ObjectId(userId),
    });
  }

  async update(id: string, data: Partial<CreateRecurringTransactionDto>, userId: string) {
    const updatePayload: any = { ...data };

    // If frequency or startDate changes, recalculate nextExecutionDate if not provided explicitly
    if ((data.frequency || data.startDate) && !data.nextExecutionDate) {
      const existing = await this.recurringModel.findOne({ _id: id, user: userId });
      if (existing) {
        const finalStartDate = data.startDate ? new Date(data.startDate) : existing.startDate;
        const finalFrequency = data.frequency || existing.frequency;
        updatePayload.nextExecutionDate = this.calculateNextExecutionDate(finalStartDate, finalFrequency);
      }
    } else if (data.nextExecutionDate) {
      updatePayload.nextExecutionDate = new Date(data.nextExecutionDate);
    }

    if (data.startDate) {
      updatePayload.startDate = new Date(data.startDate);
    }

    return this.recurringModel.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: updatePayload },
      { returnDocument: 'after' },
    );
  }

  async findAll(userId: string) {
    return this.recurringModel.find({ user: userId }).sort({ createdAt: -1 });
  }

  async remove(id: string, userId: string) {
    return this.recurringModel.deleteOne({ _id: id, user: userId }).exec();
  }

  /**
   * Evaluates all active schedules and generates standard transactions for due executions.
   */
  async triggerExecution(userId?: string) {
    const now = new Date();
    const filter: any = { isActive: true, nextExecutionDate: { $lte: now } };
    
    if (userId) {
      filter.user = new Types.ObjectId(userId);
    }

    const dueSchedulers = await this.recurringModel.find(filter);
    const executed: any[] = [];

    for (const recTx of dueSchedulers) {
      let nextExec = new Date(recTx.nextExecutionDate);

      // Catch up on any due dates (if server was down or start date is past)
      while (nextExec <= now) {
        await this.transactionsService.create({
          amount: recTx.amount,
          type: recTx.type as any,
          category: recTx.category,
          note: recTx.note || `Giao dịch định kỳ tự động (${recTx.frequency})`,
          paymentMethod: recTx.paymentMethod as any,
          date: nextExec.toISOString(),
        }, recTx.user.toString());

        executed.push({
          schedulerId: recTx._id.toString(),
          amount: recTx.amount,
          type: recTx.type,
          category: recTx.category,
          executionDate: new Date(nextExec),
        });

        nextExec = this.advanceNextExecutionDate(nextExec, recTx.frequency);
      }

      // Update next execution date
      await this.recurringModel.updateOne(
        { _id: recTx._id },
        { $set: { nextExecutionDate: nextExec } }
      );
    }

    if (executed.length > 0) {
      this.logger.log(`Executed ${executed.length} recurring transaction events.`);
    }

    return {
      executedCount: executed.length,
      details: executed,
    };
  }

  /**
   * Run automatically every day at midnight to process due transactions.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.log('Starting daily recurring transactions Cron job...');
    try {
      const result = await this.triggerExecution();
      this.logger.log(`Cron execution completed. Ran ${result.executedCount} recurring transactions.`);
    } catch (err) {
      this.logger.error('Error running recurring transactions Cron job', err);
    }
  }
}
