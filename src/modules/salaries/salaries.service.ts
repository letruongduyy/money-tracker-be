import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SalaryPlan, SalaryPlanDocument } from './schemas/salary-plan.schema';
import { CreateSalaryPlanDto } from './dto/create-salary-plan.dto';

@Injectable()
export class SalariesService {
  private readonly logger = new Logger(SalariesService.name);

  constructor(
    @InjectModel(SalaryPlan.name) private salaryPlanModel: Model<SalaryPlanDocument>,
  ) {}

  async findAll(userId: string, month?: number, year?: number): Promise<SalaryPlanDocument[]> {
    const filter: Record<string, any> = { user: userId };
    if (month) filter.month = month;
    if (year) filter.year = year;

    return this.salaryPlanModel
      .find(filter)
      .sort({ year: -1, month: -1 })
      .exec();
  }

  async findByMonth(userId: string, month: number, year: number): Promise<SalaryPlanDocument | null> {
    return this.salaryPlanModel
      .findOne({ user: userId, month, year })
      .exec();
  }

  async upsertSalaryPlan(dto: CreateSalaryPlanDto, userId: string): Promise<SalaryPlanDocument> {
    const { month, year, incomeAmount, status, confirmedAt, note, localId, allocations } = dto;

    let plan = await this.salaryPlanModel.findOne({
      user: userId,
      month,
      year,
    });

    if (plan) {
      plan.incomeAmount = incomeAmount;
      if (status) plan.status = status;
      if (confirmedAt) plan.confirmedAt = new Date(confirmedAt);
      if (note !== undefined) plan.note = note;
      if (localId) plan.localId = localId;
      if (allocations) {
        plan.allocations = allocations.map((a, idx) => ({
          localId: a.localId || `${Date.now()}_${idx}`,
          title: a.title,
          type: a.type || 'expense',
          amount: a.amount,
          targetAssetId: a.targetAssetId,
          category: a.category,
          isExecuted: a.isExecuted ?? false,
          orderIndex: a.orderIndex ?? idx,
        }));
      }
      return plan.save();
    } else {
      return this.salaryPlanModel.create({
        user: userId,
        month,
        year,
        incomeAmount,
        status: status || 'draft',
        confirmedAt: confirmedAt ? new Date(confirmedAt) : undefined,
        note,
        localId,
        allocations: (allocations || []).map((a, idx) => ({
          localId: a.localId || `${Date.now()}_${idx}`,
          title: a.title,
          type: a.type || 'expense',
          amount: a.amount,
          targetAssetId: a.targetAssetId,
          category: a.category,
          isExecuted: a.isExecuted ?? false,
          orderIndex: a.orderIndex ?? idx,
        })),
      });
    }
  }

  async syncSalaryPlans(dtos: CreateSalaryPlanDto[], userId: string): Promise<SalaryPlanDocument[]> {
    for (const dto of dtos) {
      try {
        await this.upsertSalaryPlan(dto, userId);
      } catch (e) {
        this.logger.error(`Error syncing salary plan for ${dto.month}/${dto.year}: ${e.message}`);
      }
    }
    return this.findAll(userId);
  }

  async confirmSalaryPlan(id: string, userId: string): Promise<SalaryPlanDocument> {
    const plan = await this.salaryPlanModel.findOne({
      $or: [{ _id: id }, { localId: id }],
      user: userId,
    });

    if (!plan) {
      throw new NotFoundException('Salary plan not found');
    }

    plan.status = 'confirmed';
    plan.confirmedAt = new Date();
    plan.allocations.forEach(a => {
      a.isExecuted = true;
    });

    return plan.save();
  }

  async remove(id: string, userId: string): Promise<{ success: boolean }> {
    const result = await this.salaryPlanModel.deleteOne({
      $or: [{ _id: id }, { localId: id }],
      user: userId,
    });
    return { success: result.deletedCount > 0 };
  }
}
