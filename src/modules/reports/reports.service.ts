import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron } from "@nestjs/schedule";
import { Model } from "mongoose";
import { PushService } from "../push/push.service";
import { TransactionsService } from "../transactions/transactions.service";
import { User, UserDocument } from "../users/schemas/user.schema";

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private transactionsService: TransactionsService,
    private pushService: PushService,
  ) {}

  /**
   * Runs every day at 11:00 PM (server local time).
   * Sends each user a personalised daily spending summary of today.
   */
  @Cron("0 23 * * *", { name: "daily-report" })
  async sendDailyReports() {
    this.logger.log("⏰ Starting daily analytics push notifications…");

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    await this.generateAndSendReports("daily", todayStart, todayEnd);
  }

  /**
   * Runs every Monday at 9:00 AM (server local time).
   * Sends each user a personalised weekly spending summary.
   */
  @Cron("0 9 * * 1", { name: "weekly-report" })
  async sendWeeklyReports() {
    this.logger.log("⏰ Starting weekly analytics push notifications…");

    const now = new Date();
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - 7);
    lastMonday.setHours(0, 0, 0, 0);

    const lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - 1);
    lastSunday.setHours(23, 59, 59, 999);

    await this.generateAndSendReports("weekly", lastMonday, lastSunday);
  }

  /**
   * Runs on the first day of every month at 9:00 AM (server local time).
   * Sends each user a personalised monthly spending summary.
   */
  @Cron("0 9 1 * *", { name: "monthly-report" })
  async sendMonthlyReports() {
    this.logger.log("⏰ Starting monthly analytics push notifications…");

    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    await this.generateAndSendReports("monthly", lastMonthStart, lastMonthEnd);
  }

  // ─── shared notification runner ─────────────────────────────────────────────

  private async generateAndSendReports(
    period: "daily" | "weekly" | "monthly",
    startDate: Date,
    endDate: Date,
  ) {
    // Fetch all users that have at least one FCM token
    const users = await this.userModel
      .find({ fcmToken: { $exists: true, $ne: "" } })
      .select("_id name fcmToken")
      .lean();

    this.logger.log(`Found ${users.length} user(s) with FCM tokens for ${period} report`);

    let successUsers = 0;
    let failedUsers = 0;

    for (const user of users) {
      try {
        const userId = String(user._id);
        const analytics = await this.transactionsService.getWeeklyAnalytics(
          userId,
          startDate,
          endDate,
        );

        const { title, body } = this.buildMessage(user.name, analytics, period);

        const result = await this.pushService.sendToUser(userId, {
          title,
          body,
          data: {
            type: `${period}_report`,
            totalIncome: String(analytics.totalIncome),
            totalExpense: String(analytics.totalExpense),
            net: String(analytics.net),
            txCount: String(analytics.txCount),
          },
        });

        if (result.success) successUsers++;
        else failedUsers++;
      } catch (err: any) {
        this.logger.error(
          `Failed to send ${period} report to user ${user._id}: ${err?.message || err}`,
        );
        failedUsers++;
      }
    }

    this.logger.log(
      `${period.charAt(0).toUpperCase() + period.slice(1)} report done — ✅ ${successUsers} succeeded, ❌ ${failedUsers} failed`,
    );
  }

  // ─── helpers ────────────────────────────────────────────────────────────────

  private formatVnd(amount: number): string {
    return new Intl.NumberFormat("vi-VN").format(Math.round(amount)) + "₫";
  }

  private topCategory(
    expenseByCategory: Record<string, number>,
  ): string | null {
    const entries = Object.entries(expenseByCategory);
    if (!entries.length) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0].replace(/_/g, " ");
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
    period: "daily" | "weekly" | "monthly",
  ): { title: string; body: string } {
    const { totalIncome, totalExpense, net, txCount, expenseByCategory } =
      analytics;

    const periodLabel = period === "daily" ? "today" : period === "weekly" ? "last week" : "last month";
    const titleLabel = period.charAt(0).toUpperCase() + period.slice(1);

    if (txCount === 0) {
      return {
        title: `📊 ${titleLabel} Report`,
        body: `Hi ${name}! No transactions recorded ${periodLabel}. Start tracking to see your insights! 💡`,
      };
    }

    const netLabel =
      net >= 0
        ? `saved ${this.formatVnd(net)} 🎉`
        : `overspent by ${this.formatVnd(Math.abs(net))} ⚠️`;

    const top = this.topCategory(expenseByCategory);
    const topLine = top ? ` Top spending: ${top}.` : "";

    return {
      title: `📊 Your ${titleLabel} Report`,
      body:
        `Hi ${name}! ${period === "daily" ? "Today" : period === "weekly" ? "Last week" : "Last month"} you ${netLabel}. ` +
        `Income: ${this.formatVnd(totalIncome)} · Expense: ${this.formatVnd(totalExpense)}.` +
        topLine,
    };
  }
}
