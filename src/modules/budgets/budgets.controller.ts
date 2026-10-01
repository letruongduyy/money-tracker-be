import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  Query,
  Param,
  Delete,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';

@Controller('budgets')
@UseGuards(AuthGuard('jwt'))
export class BudgetsController {
  private readonly logger = new Logger(BudgetsController.name);

  constructor(private readonly service: BudgetsService) {}

  @Post()
  async create(@Body() body: CreateBudgetDto, @Req() req) {
    this.logger.log(`[POST /budgets] user=${req.user.userId} ${JSON.stringify(body)}`);
    return this.service.upsertBudget(body, req.user.userId);
  }

  @Post('sync')
  async sync(@Body() body: CreateBudgetDto[], @Req() req) {
    this.logger.log(
      `[POST /budgets/sync] user=${req.user.userId} items=${body?.length ?? 0} ${JSON.stringify(body)}`,
    );
    return this.service.syncBudgets(body, req.user.userId);
  }

  @Get()
  async findAll(
    @Req() req,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    this.logger.log(
      `[GET /budgets] user=${req.user.userId} month=${month ?? 'all'} year=${year ?? 'all'}`,
    );
    const result = await this.service.findAll(
      req.user.userId,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );
    this.logger.log(
      `[GET /budgets] user=${req.user.userId} returned ${result.length} budgets: ${result
        .map((b) => `${b.category}=${b.amount} (${b.month}/${b.year})`)
        .join(', ')}`,
    );
    return result;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    return this.service.remove(id, req.user.userId);
  }
}
