import { Controller, Post, Get, Body, Req, UseGuards, Query, Patch, Param, Delete, BadRequestException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('transactions')
@UseGuards(AuthGuard('jwt'))
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) { }

  @Post()
  create(@Body() body: CreateTransactionDto, @Req() req) {
    return this.transactionsService.create(body, req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: Partial<CreateTransactionDto>,
    @Req() req,
  ) {
    return this.transactionsService.update(id, body, req.user.userId);
  }

  @Get('analytics')
  getAnalytics(
    @Req() req,
    @Query('period') period: 'daily' | 'weekly' | 'monthly',
    @Query('date') dateString?: string,
  ) {
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      throw new BadRequestException('Invalid period');
    }
    const referenceDate = dateString ? new Date(dateString) : new Date();
    return this.transactionsService.getAnalyticsForPeriod(
      req.user.userId,
      period,
      referenceDate,
    );
  }

  @Get('weekly')
  getWeekly(
    @Req() req,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.transactionsService.getWeeklyTransactions(
      req.user.userId,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );
  }

  @Get()
  findAll(
    @Req() req,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
  ) {
    return this.transactionsService.findAll(
      req.user.userId,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
      sortBy,
      order,
    );
  }

  @Get('balance')
  getBalance(@Req() req) {
    return this.transactionsService.getBalance(req.user.userId);
  }

  @Get('categories')
  getCategories() {
    return this.transactionsService.getCategories();
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.transactionsService.remove(id, req.user.userId);
  }
}
