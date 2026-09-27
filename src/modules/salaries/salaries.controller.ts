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
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SalariesService } from './salaries.service';
import { CreateSalaryPlanDto } from './dto/create-salary-plan.dto';

@Controller('salaries')
@UseGuards(AuthGuard('jwt'))
export class SalariesController {
  constructor(private readonly service: SalariesService) {}

  @Post()
  async create(@Body() body: CreateSalaryPlanDto, @Req() req) {
    return this.service.upsertSalaryPlan(body, req.user.userId);
  }

  @Post('sync')
  async sync(@Body() body: CreateSalaryPlanDto[], @Req() req) {
    return this.service.syncSalaryPlans(body, req.user.userId);
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

  @Get(':month/:year')
  async findByMonth(
    @Param('month', ParseIntPipe) month: number,
    @Param('year', ParseIntPipe) year: number,
    @Req() req,
  ) {
    return this.service.findByMonth(req.user.userId, month, year);
  }

  @Post(':id/confirm')
  async confirm(@Param('id') id: string, @Req() req) {
    return this.service.confirmSalaryPlan(id, req.user.userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    return this.service.remove(id, req.user.userId);
  }
}
