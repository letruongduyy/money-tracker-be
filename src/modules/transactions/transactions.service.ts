import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
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
    const mongoose = await import('mongoose');
    const userObjectId = new mongoose.Types.ObjectId(userId);

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
}
