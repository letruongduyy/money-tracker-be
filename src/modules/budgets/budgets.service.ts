import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Budget, BudgetDocument } from './schemas/budget.schema';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { Transaction, TransactionDocument } from '../transactions/schemas/transaction.schema';
import { PushService } from '../push/push.service';

const CategoryDisplayNames: Record<string, string> = {
  food_and_dining: 'Ăn uống',
  transport: 'Di chuyển',
  shopping: 'Mua sắm',
  entertainment: 'Giải trí',
  bills_and_utilities: 'Hóa đơn & Tiện ích',
  health: 'Sức khỏe',
  education: 'Giáo dục',
  baby: 'Con cái',
  give_someone_money: 'Cho đi/Quà tặng',
  save_money: 'Tiết kiệm',
  other: 'Khác',
};

@Injectable()
export class BudgetsService {
  private readonly logger = new Logger(BudgetsService.name);

  constructor(
    @InjectModel(Budget.name) private budgetModel: Model<BudgetDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    private pushService: PushService,
  ) {}

  async upsertBudget(dto: CreateBudgetDto, userId: string): Promise<BudgetDocument> {
    const { category, amount, month, year, localId, id } = dto;

    // Check if budget already exists
    let budget = await this.budgetModel.findOne({
      user: userId,
      category,
      month,
      year,
    });

    if (budget) {
      // If budget exists, update it. If the amount increased, we can optionally reset notification flags if spending is now below thresholds.
      const currentSpending = await this.calculateCategorySpending(userId, category, month, year);
      const notified80 = currentSpending >= amount * 0.8 ? budget.notified80 : false;
      const notified100 = currentSpending >= amount ? budget.notified100 : false;

      budget.amount = amount;
      budget.notified80 = notified80;
      budget.notified100 = notified100;
      if (localId) budget.localId = localId;
      await budget.save();
    } else {
      // Create new budget
      budget = await this.budgetModel.create({
        user: userId,
        category,
        amount,
        month,
        year,
        localId,
        _id: id,
      });
    }

    return budget;
  }

  async syncBudgets(dtoList: CreateBudgetDto[], userId: string): Promise<string[]> {
    const syncedIds: string[] = [];
    for (const dto of dtoList) {
      try {
        const saved = await this.upsertBudget(dto, userId);
        syncedIds.push((saved as any)._id.toString());
      } catch (err) {
        this.logger.error(`Error syncing budget: ${err.message}`, err.stack);
      }
    }
    return syncedIds;
  }

  async findAll(userId: string, month?: number, year?: number): Promise<BudgetDocument[]> {
    const filter: any = { user: userId };
    if (month !== undefined) filter.month = month;
    if (year !== undefined) filter.year = year;
    return this.budgetModel.find(filter).sort({ category: 1 });
  }

  async remove(id: string, userId: string): Promise<any> {
    return this.budgetModel.deleteOne({ _id: id, user: userId }).exec();
  }

  async checkBudgetAndNotify(userId: string, category: string, date: Date): Promise<void> {
    const month = date.getUTCMonth() + 1;
    const year = date.getUTCFullYear();

    const budget = await this.budgetModel.findOne({
      user: userId,
      category,
      month,
      year,
    });

    if (!budget) return;

    const totalSpending = await this.calculateCategorySpending(userId, category, month, year);
    const categoryName = CategoryDisplayNames[category] || category;

    if (totalSpending >= budget.amount && !budget.notified100) {
      // Send 100% threshold alert
      const totalStr = totalSpending.toLocaleString('vi-VN');
      const limitStr = budget.amount.toLocaleString('vi-VN');
      await this.pushService.sendToUser(userId, {
        title: '⚠️ Vượt ngân sách chi tiêu!',
        body: `Mục "${categoryName}" đã tiêu ${totalStr}đ / ${limitStr}đ (vượt hạn mức).`,
        data: {
          route: 'budget_alert',
          type: 'budget_alert',
        },
      });
      budget.notified100 = true;
      budget.notified80 = true; // Mark 80% as also notified
      await budget.save();
      this.logger.log(`User ${userId} exceeded 100% budget for ${category}: ${totalSpending}/${budget.amount}`);
    } else if (totalSpending >= budget.amount * 0.8 && !budget.notified80) {
      // Send 80% threshold alert
      const totalStr = totalSpending.toLocaleString('vi-VN');
      const limitStr = budget.amount.toLocaleString('vi-VN');
      await this.pushService.sendToUser(userId, {
        title: '⚠️ Cảnh báo ngân sách!',
        body: `Mục "${categoryName}" đã dùng hết 80% ngân sách (${totalStr}đ / ${limitStr}đ).`,
        data: {
          route: 'budget_alert',
          type: 'budget_alert',
        },
      });
      budget.notified80 = true;
      await budget.save();
      this.logger.log(`User ${userId} reached 80% budget for ${category}: ${totalSpending}/${budget.amount}`);
    }
  }

  private async calculateCategorySpending(userId: string, category: string, month: number, year: number): Promise<number> {
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const transactions = await this.transactionModel.find({
      user: userId,
      category,
      type: 'expense',
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    return transactions.reduce((sum, tx) => sum + tx.amount, 0);
  }
}
