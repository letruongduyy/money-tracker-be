import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RecurringTransactionsService } from './recurring-transactions.service';
import { CreateRecurringTransactionDto } from './dto/create-recurring-transaction.dto';

@Controller('recurring-transactions')
@UseGuards(AuthGuard('jwt'))
export class RecurringTransactionsController {
  constructor(private readonly service: RecurringTransactionsService) {}

  @Post()
  create(@Body() body: CreateRecurringTransactionDto, @Req() req) {
    return this.service.create(body, req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: Partial<CreateRecurringTransactionDto>,
    @Req() req,
  ) {
    return this.service.update(id, body, req.user.userId);
  }

  @Get()
  findAll(@Req() req) {
    return this.service.findAll(req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.service.remove(id, req.user.userId);
  }

  @Post('trigger-execution')
  triggerExecution(@Req() req) {
    return this.service.triggerExecution(req.user.userId);
  }
}
