import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DebtsController } from './debts.controller';
import { DebtsService } from './debts.service';
import { Debt, DebtSchema } from './schemas/debt.schema';
import { PushModule } from '../push/push.module';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Debt.name, schema: DebtSchema },
      { name: User.name, schema: UserSchema },
    ]),
    PushModule,
  ],
  controllers: [DebtsController],
  providers: [DebtsService],
  exports: [DebtsService],
})
export class DebtsModule {}
