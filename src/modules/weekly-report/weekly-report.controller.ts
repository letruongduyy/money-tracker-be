import { Controller, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WeeklyReportService } from './weekly-report.service';

@Controller('weekly-report')
@UseGuards(AuthGuard('jwt'))
export class WeeklyReportController {
  constructor(private readonly weeklyReportService: WeeklyReportService) {}

  @Post('trigger')
  @HttpCode(HttpStatus.OK)
  async triggerReport() {
    await this.weeklyReportService.sendWeeklyReports();
    return {
      success: true,
      message: 'Weekly reports triggered successfully',
    };
  }
}
