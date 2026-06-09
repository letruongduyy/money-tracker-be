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
      'https://i.pinimg.com/1200x/45/07/c5/4507c57013d379d050550dcb77e752c1.jpg', // None
      'https://i.pinimg.com/webp85/736x/b8/b1/14/b8b1147c5116733231dfbb9f2bb770f8.webp',
      'https://i.pinimg.com/736x/8c/fc/aa/8cfcaa516f47620347cd99f2ea26668b.jpg',
      'https://i.pinimg.com/webp85/736x/95/6e/b6/956eb606ccd493d4a9efae2b8d13171e.webp',
      'https://i.pinimg.com/webp85/1200x/d2/79/5c/d2795c371dd1e318e0dd9cda5c5b94f0.webp',
      'https://i.pinimg.com/736x/bf/f6/5a/bff65a4bd3d92a7aef1e5db46214e7af.jpg',
      'https://i.pinimg.com/736x/e3/57/5e/e3575e2b4b6fbfa062d586f261f06525.jpg',
      'https://i.pinimg.com/736x/61/df/9c/61df9c2b8a063e48f55686ca300e4b67.jpg',
      'https://i.pinimg.com/webp85/736x/61/97/6f/61976fcdb0a2ac137f4576a9f61b4ae5.webp',
      'https://i.pinimg.com/736x/d8/f2/3c/d8f23c0520758606fce71cce2a74d87f.jpg',
      'https://i.pinimg.com/1200x/ff/8a/56/ff8a5646cf7349564a90b36edd488c78.jpg'
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
