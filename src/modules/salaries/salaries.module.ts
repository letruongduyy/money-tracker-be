import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SalariesController } from './salaries.controller';
import { SalariesService } from './salaries.service';
import { SalaryPlan, SalaryPlanSchema } from './schemas/salary-plan.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SalaryPlan.name, schema: SalaryPlanSchema },
    ]),
  ],
  controllers: [SalariesController],
  providers: [SalariesService],
  exports: [SalariesService],
})
export class SalariesModule {}
