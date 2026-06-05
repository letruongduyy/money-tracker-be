import {
  IsNumber,
  IsEnum,
  IsString,
  IsOptional,
  IsDateString,
  Validate,
  IsBoolean,
} from 'class-validator';
import { TransactionType, PaymentMethod } from '../../transactions/schemas/transaction.schema';
import { IsValidCategoryConstraint } from '../../transactions/dto/create-transaction.dto';
import { RecurringFrequency } from '../schemas/recurring-transaction.schema';

export class CreateRecurringTransactionDto {
  @IsOptional()
  @IsString()
  localId?: string;

  @IsNumber()
  amount: number;

  @IsEnum(TransactionType, { message: 'Type must be either income or expense' })
  type: TransactionType;

  @IsString()
  @Validate(IsValidCategoryConstraint)
  category: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsEnum(PaymentMethod, { message: 'Invalid payment method' })
  paymentMethod: PaymentMethod;

  @IsEnum(RecurringFrequency, { message: 'Invalid frequency' })
  frequency: RecurringFrequency;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  nextExecutionDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
