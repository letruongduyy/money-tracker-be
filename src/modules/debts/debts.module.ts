import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { DebtsController } from './debts.controller';
import { DebtsService } from './debts.service';
import { Debt, DebtSchema } from './schemas/debt.schema';
import { PushModule } from '../push/push.module';
import { DebtReminderProcessor } from './debt-reminder.processor';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Debt.name, schema: DebtSchema }]),
    BullModule.registerQueue({ name: 'debt-reminder' }),
    PushModule,
  ],
  controllers: [DebtsController],
  providers: [DebtsService, DebtReminderProcessor],
  exports: [DebtsService],
})
export class DebtsModule {}
