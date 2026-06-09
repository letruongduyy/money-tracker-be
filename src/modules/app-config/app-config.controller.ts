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

    const noteBgImages = [
      'https://i.pinimg.com/1200x/45/07/c5/4507c57013d379d050550dcb77e752c1.jpg',
      'https://i.pinimg.com/1200x/2c/c2/d6/2cc2d6203854347ea995c9ba3e753467.jpg',
      'https://i.pinimg.com/1200x/ae/80/e6/ae80e67e5ca52c1d27dfde74f04f60a8.jpg',
      'https://i.pinimg.com/1200x/a2/da/52/a2da5285ecd0650d399a11d59cd8943c.jpg'

    ];

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
