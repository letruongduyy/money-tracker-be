import { Controller, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard('jwt'))
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('trigger-daily')
  @HttpCode(HttpStatus.OK)
  async triggerDailyReport() {
    await this.reportsService.sendDailyReports();
    return {
      success: true,
      message: 'Daily reports triggered successfully',
    };
  }

  @Post('trigger-weekly')
  @HttpCode(HttpStatus.OK)
  async triggerWeeklyReport() {
    await this.reportsService.sendWeeklyReports();
    return {
      success: true,
      message: 'Weekly reports triggered successfully',
    };
  }

  @Post('trigger-monthly')
  @HttpCode(HttpStatus.OK)
  async triggerMonthlyReport() {
    await this.reportsService.sendMonthlyReports();
    return {
      success: true,
      message: 'Monthly reports triggered successfully',
    };
  }

  @Post('trigger-transaction-reminder')
  @HttpCode(HttpStatus.OK)
  async triggerTransactionReminder() {
    await this.reportsService.sendDailyTransactionReminder();
    return {
      success: true,
      message: 'Daily transaction reminder triggered successfully',
    };
  }
}
