import { Controller, Get } from "@nestjs/common";
import {
  TransactionCategories,
  TransactionType,
  PaymentMethod,
} from "../transactions/schemas/transaction.schema";

@Controller("app-config")
export class AppConfigController {
  @Get()
  getConfig() {
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
    };
  }
}
