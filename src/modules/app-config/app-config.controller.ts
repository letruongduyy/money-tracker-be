import { Controller, Get, Post, Delete, Query, UseGuards, Body } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {
  TransactionCategories,
  TransactionType,
  PaymentMethod,
} from "../transactions/schemas/transaction.schema";
import { AppConfigService } from "./app-config.service";
import { UpdateVersionDto } from "./dto/update-version.dto";

@Controller("app-config")
export class AppConfigController {
  constructor(private appConfigService: AppConfigService) {}

  @Get("update-check")
  async checkUpdate(
    @Query("platform") platform: string,
    @Query("version") version: string,
    @Query("buildNumber") buildNumber: string,
  ) {
    const buildNum = parseInt(buildNumber || "0", 10);
    return this.appConfigService.checkUpdate(platform, version, buildNum);
  }

  @Post("update-config")
  @UseGuards(AuthGuard("jwt"))
  async updateConfig(@Body() dto: UpdateVersionDto) {
    return this.appConfigService.updateLatestVersion(dto);
  }

  @Post("note-backgrounds")
  @UseGuards(AuthGuard("jwt"))
  async addBackground(@Body() body: { url: string }) {
    const url = await this.appConfigService.addNoteBackground(body.url);
    return { url };
  }

  @Delete("note-backgrounds")
  @UseGuards(AuthGuard("jwt"))
  async deleteBackground(@Body() body: { url: string }) {
    await this.appConfigService.deleteNoteBackground(body.url);
    return { success: true };
  }

  @Get()
  async getConfig() {
    const typeLabels: Record<string, string> = {
      [TransactionType.INCOME]: "Thu nhập",
      [TransactionType.EXPENSE]: "Chi tiêu",
    };

    const paymentLabels: Record<string, string> = {
      [PaymentMethod.CASH]: "Tiền mặt",
      [PaymentMethod.CARD]: "Thẻ",
      [PaymentMethod.E_WALLET]: "Ví điện tử",
      [PaymentMethod.BANK_TRANSFER]: "Chuyển khoản",
    };

    const categoryLabels: Record<string, string> = {
      salary: "Lương",
      freelance: "Làm nghề tự do",
      gift: "Quà tặng",
      investment: "Đầu tư",
      other: "Khác",
      food_and_dining: "Ăn uống",
      transport: "Di chuyển",
      shopping: "Mua sắm",
      entertainment: "Giải trí",
      bills_and_utilities: "Hóa đơn & Tiện ích",
      health: "Sức khỏe",
      education: "Giáo dục",
      baby: "Em bé",
      give_someone_money: "Cho/tặng tiền",
      save_money: "Tiết kiệm",
    };

    const formatCategories = Object.entries(TransactionCategories).reduce(
      (acc, [type, categories]) => {
        acc[type] = categories.map((cat) => ({
          id: cat,
          label: categoryLabels[cat] || cat,
        }));
        return acc;
      },
      {} as Record<string, any>,
    );

    const noteBgImages = await this.appConfigService.getNoteBackgrounds();

    return {
      transactionTypes: Object.values(TransactionType).map((v) => ({
        id: v,
        label: typeLabels[v] || v,
      })),
      paymentMethods: Object.values(PaymentMethod).map((v) => ({
        id: v,
        label: paymentLabels[v] || v,
      })),
      categories: formatCategories,
      noteBgImages,
    };
  }
}
