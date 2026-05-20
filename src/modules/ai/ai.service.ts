import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TransactionsService } from "../transactions/transactions.service";

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private readonly transactionsService: TransactionsService) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set in the environment variables");
    }
    this.genAI = new GoogleGenerativeAI(apiKey ?? "");
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  async parseTransactionFromNote(text: string, userId: string) {
    try {
      // Common types and categories matched exactly with Schema Enums
      const types = "income, expense";
      const paymentMethods = "cash, card, e_wallet, bank_transfer";
      const categories = `
        INCOME Categories: salary, freelance, gift, investment, other
        EXPENSE Categories: food_and_dining, transport, shopping, entertainment, bills_and_utilities, health, education, baby, give_someone_money, save_money, other
      `;

      const prompt = `
Bạn là một trợ lý ảo chuyên phân tích và bóc tách các khoản chi tiêu/thu nhập từ câu nói tự nhiên sang định dạng JSON chuẩn.
Hãy đọc câu sau và trích xuất các thông tin:
"${text}"

Danh sách dữ liệu hợp lệ bắt buộc:
- Types: ${types}
- Payment Methods: ${paymentMethods}
- Categories: 
${categories}

QUY TẮC BÓC TÁCH:
1. "amount": Số tiền (kiểu số nguyên). Ví dụ: "50k" -> 50000, "1 củ" -> 1000000.
2. "type": "expense" nếu là chi tiêu, "income" nếu là thu nhập.
3. "paymentMethod": CHỈ ĐƯỢC CHỌN 1 TRONG CÁC GIÁ TRỊ: cash, card, e_wallet, bank_transfer.
4. "category": CHỈ ĐƯỢC CHỌN 1 TRONG CÁC GIÁ TRỊ TỪ DANH SÁCH CATEGORIES Ở TRÊN cho phù hợp nhất.
5. "note": Trích xuất ngắn gọn mục đích (Ví dụ: "Đi Bách Hóa Xanh").
6. "date": Chuỗi ngày theo định dạng YYYY-MM-DD. Hãy tính toán dựa trên ngày hiện tại là ${new Date().toISOString().split("T")[0]}. ("Nay" -> Hôm nay, "Hôm qua" -> Ngày hôm qua).

CHỈ TRẢ VỀ ĐÚNG 1 ĐOẠN MÃ JSON hợp lệ, KHÔNG THÊM BẤT KỲ VĂN BẢN NÀO KHÁC BÊN NGOÀI JSON. Đừng dùng block code (\`\`\`json).
Ví dụ định dạng mong muốn:
{
  "amount": 50000,
  "type": "expense",
  "paymentMethod": "cash",
  "category": "shopping",
  "note": "Đi bách hóa xanh",
  "date": "${new Date().toISOString().split("T")[0]}"
}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let textResponse = response.text().trim();

      if (textResponse.startsWith("\`\`\`json")) {
        textResponse = textResponse
          .replace("\`\`\`json", "")
          .replace("\`\`\`", "")
          .trim();
      } else if (textResponse.startsWith("\`\`\`")) {
        textResponse = textResponse.replace("\`\`\`", "").trim();
      }

      const parsedData = JSON.parse(textResponse);

      // Safety mappings in case AI hallucinated slightly
      if (parsedData.categoryId && !parsedData.category) {
        parsedData.category = parsedData.categoryId;
      }
      if (parsedData.paymentMethod === "credit_card")
        parsedData.paymentMethod = "card";
      if (parsedData.paymentMethod === "transfer")
        parsedData.paymentMethod = "bank_transfer";

      // Automatically save to MongoDB using TransactionsService
      const savedTransaction = await this.transactionsService.create(
        parsedData,
        userId,
      );

      return { status: true, data: savedTransaction };
    } catch (error: any) {
      console.error("Error parsing transaction with AI:", error);
      throw new InternalServerErrorException(
        "Failed to parse text with AI: " + error.message,
      );
    }
  }
}
