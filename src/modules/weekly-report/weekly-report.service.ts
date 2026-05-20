import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { TransactionsService } from '../transactions/transactions.service';
import { PushService } from '../push/push.service';

@Injectable()
export class WeeklyReportService {
  private readonly logger = new Logger(WeeklyReportService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private transactionsService: TransactionsService,
    private pushService: PushService,
  ) {}

  /**
   * Runs every Monday at 9:00 AM (server local time).
   * Sends each user a personalised weekly spending summary.
   */
  @Cron('0 9 * * 1', { name: 'weekly-report' })
  async sendWeeklyReports() {
    this.logger.log('⏰ Starting weekly analytics push notifications…');

    // Date range: last Monday 00:00 → last Sunday 23:59:59
    const now = new Date();
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - 7);
    lastMonday.setHours(0, 0, 0, 0);

    const lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - 1);
    lastSunday.setHours(23, 59, 59, 999);

    // Fetch all users that have at least one FCM token
    const users = await this.userModel
      .find({ fcmToken: { $exists: true, $ne: '' } })
      .select('_id name fcmToken')
      .lean();

    this.logger.log(`Found ${users.length} user(s) with FCM tokens`);

    let successUsers = 0;
    let failedUsers = 0;

    for (const user of users) {
      try {
        const userId = String(user._id);
        const analytics = await this.transactionsService.getWeeklyAnalytics(
          userId,
          lastMonday,
          lastSunday,
        );

        const { title, body } = this.buildMessage(user.name, analytics);

        const result = await this.pushService.sendToUser(userId, {
          title,
          body,
          data: {
            type: 'weekly_report',
            totalIncome: String(analytics.totalIncome),
            totalExpense: String(analytics.totalExpense),
            net: String(analytics.net),
            txCount: String(analytics.txCount),
          },
        });

        if (result.success) successUsers++;
        else failedUsers++;
      } catch (err) {
        this.logger.error(
          `Failed to send weekly report to user ${user._id}: ${err.message}`,
        );
        failedUsers++;
      }
    }

    this.logger.log(
      `Weekly report done — ✅ ${successUsers} succeeded, ❌ ${failedUsers} failed`,
    );
  }

  // ─── helpers ────────────────────────────────────────────────────────────────

  private formatVnd(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + '₫';
  }

  private topCategory(expenseByCategory: Record<string, number>): string | null {
    const entries = Object.entries(expenseByCategory);
    if (!entries.length) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0].replace(/_/g, ' ');
  }

  private buildMessage(
    name: string,
    analytics: {
      totalIncome: number;
      totalExpense: number;
      net: number;
      txCount: number;
      expenseByCategory: Record<string, number>;
    },
  ): { title: string; body: string } {
    const { totalIncome, totalExpense, net, txCount, expenseByCategory } =
      analytics;

    if (txCount === 0) {
      return {
        title: `📊 Weekly Report`,
        body: `Hi ${name}! No transactions recorded last week. Start tracking to see your insights! 💡`,
      };
    }

    const netLabel =
      net >= 0
        ? `saved ${this.formatVnd(net)} 🎉`
        : `overspent by ${this.formatVnd(Math.abs(net))} ⚠️`;

    const top = this.topCategory(expenseByCategory);
    const topLine = top ? ` Top spending: ${top}.` : '';

    return {
      title: `📊 Your Weekly Report`,
      body:
        `Hi ${name}! Last week you ${netLabel}. ` +
        `Income: ${this.formatVnd(totalIncome)} · Expense: ${this.formatVnd(totalExpense)}.` +
        topLine,
    };
  }
}
