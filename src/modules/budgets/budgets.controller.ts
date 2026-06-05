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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';

@Controller('budgets')
@UseGuards(AuthGuard('jwt'))
export class BudgetsController {
  constructor(private readonly service: BudgetsService) {}

  @Post()
  async create(@Body() body: CreateBudgetDto, @Req() req) {
    return this.service.upsertBudget(body, req.user.userId);
  }

  @Post('sync')
  async sync(@Body() body: CreateBudgetDto[], @Req() req) {
    return this.service.syncBudgets(body, req.user.userId);
  }

  @Get()
  async findAll(
    @Req() req,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.service.findAll(
      req.user.userId,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    return this.service.remove(id, req.user.userId);
  }
}
