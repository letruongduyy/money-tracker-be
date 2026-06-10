import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Debt, DebtDocument } from './schemas/debt.schema';
import { CreateDebtDto } from './dto/debt.dto';

@Injectable()
export class DebtsService {
  private readonly logger = new Logger(DebtsService.name);

  constructor(
    @InjectModel(Debt.name)
    private debtModel: Model<DebtDocument>,
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

        if (updated) {
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
    } catch (error) {
      this.logger.error(`Failed to remove debt ${id}`, error as Error);
      throw error;
    }
  }
}
