import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Transaction,
  TransactionDocument,
  TransactionCategories,
} from "./schemas/transaction.schema";
import { CreateTransactionDto } from "./dto/create-transaction.dto";

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}

  create(data: CreateTransactionDto, userId: string) {
    return this.transactionModel.create({
      ...data,
      user: userId,
    });
  }

  update(id: string, data: Partial<CreateTransactionDto>, userId: string) {
    return this.transactionModel.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: data },
      { returnDocument: 'after' },
    );
  }

  findAll(userId: string, month?: number, year?: number, sortBy: string = 'date', order: string = 'desc') {
    const filter: any = { user: userId };

    if (year) {
      const startDate = new Date(year, (month ?? 1) - 1, 1);
      const endDate = month
        ? new Date(year, month, 0, 23, 59, 59, 999)
        : new Date(year, 11, 31, 23, 59, 59, 999);

      filter.date = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj = { [sortBy]: sortOrder };

    return this.transactionModel.find(filter).sort(sortObj as any);
  }

  getCategories() {
    return TransactionCategories;
  }

  async getBalance(userId: string) {
    const result = await this.transactionModel.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);

    let income = 0;
    let expense = 0;

    result.forEach((r) => {
      if (r._id === "income") income = r.total;
      else expense = r.total;
    });

    return {
      income,
      expense,
      balance: income - expense,
    };
  }

  async remove(id: string, userId: string) {
    return this.transactionModel.deleteOne({ _id: id, user: userId }).exec();
  }

  async getWeeklyAnalytics(userId: string, from: Date, to: Date) {
    const userObjectId = new Types.ObjectId(userId);

    const results = await this.transactionModel.aggregate([
      {
        $match: {
          user: userObjectId,
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

    let totalIncome = 0;
    let totalExpense = 0;
    let txCount = 0;
    const expenseByCategory: Record<string, number> = {};

    for (const r of results) {
      txCount += r.count;
      if (r._id.type === 'income') {
        totalIncome += r.total;
      } else {
        totalExpense += r.total;
        expenseByCategory[r._id.category] =
          (expenseByCategory[r._id.category] ?? 0) + r.total;
      }
    }

    return {
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
      txCount,
      expenseByCategory,
    };
  }

  async getAnalyticsForPeriod(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly',
    date: Date,
  ) {
    let startDate: Date;
    let endDate: Date;

    if (period === 'daily') {
      startDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
      endDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
    } else if (period === 'weekly') {
      startDate = this.getStartOfWeek(date);
      endDate = new Date(startDate);
      endDate.setUTCDate(startDate.getUTCDate() + 6);
      endDate.setUTCHours(23, 59, 59, 999);
    } else if (period === 'monthly') {
      startDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    } else {
      throw new Error('Invalid period');
    }

    return this.transactionModel.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: -1 });
  }

  private getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setUTCDate(diff));
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }

  async getWeeklyTransactions(userId: string, month?: number, year?: number) {
    const transactions = await this.findAll(userId, month, year, 'date', 'desc');

    const weeksMap = new Map<string, {
      weekStart: string;
      weekEnd: string;
      income: number;
      expense: number;
      balance: number;
      transactions: any[];
    }>();

    for (const tx of transactions) {
      const txDate = new Date(tx.date);
      const startOfWeek = this.getStartOfWeek(txDate);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
      endOfWeek.setUTCHours(23, 59, 59, 999);

      const weekKey = startOfWeek.toISOString().split('T')[0];

      if (!weeksMap.has(weekKey)) {
        weeksMap.set(weekKey, {
          weekStart: weekKey,
          weekEnd: endOfWeek.toISOString().split('T')[0],
          income: 0,
          expense: 0,
          balance: 0,
          transactions: [],
        });
      }

      const weekData = weeksMap.get(weekKey)!;
      weekData.transactions.push(tx);

      if (tx.type === 'income') {
        weekData.income += tx.amount;
      } else if (tx.type === 'expense') {
        weekData.expense += tx.amount;
      }
      weekData.balance = weekData.income - weekData.expense;
    }

    return Array.from(weeksMap.values());
  }
}
