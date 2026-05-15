import {
    IsNumber,
    IsEnum,
    IsString,
    IsOptional,
    IsDateString,
    ValidateNested,
    Validate,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationArguments
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType, PaymentMethod, TransactionCategories } from '../schemas/transaction.schema';

@ValidatorConstraint({ name: 'isValidCategory', async: false })
export class IsValidCategoryConstraint implements ValidatorConstraintInterface {
    validate(category: string, args: ValidationArguments) {
        const obj = args.object as any;
        const type = obj.type;

        if (!type || !TransactionCategories[type]) {
            return false;
        }

        return TransactionCategories[type].includes(category);
    }

    defaultMessage(args: ValidationArguments) {
        const obj = args.object as any;
        const type = obj.type;
        return `Category '${args.value}' is not valid for transaction type '${type}'.`;
    }
}

class LocationDto {
    @IsNumber()
    lat: number;

    @IsNumber()
    lng: number;
}

export class CreateTransactionDto {
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

    @IsOptional()
    @ValidateNested()
    @Type(() => LocationDto)
    location?: LocationDto;

    @IsEnum(PaymentMethod, { message: 'Invalid payment method' })
    paymentMethod: PaymentMethod;

    @IsOptional()
    @IsDateString()
    date?: string;
}
