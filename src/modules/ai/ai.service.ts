import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set in the environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey || 'AIzaSyB6QM6ROWrxlbgBNiXKaMxECLFcS7En-jY');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async parseTransactionFromNote(text: string) {
    try {
      // Common types and categories
      const types = 'income, expense';
      const paymentMethods = 'cash, credit_card, transfer';
      const categories = `
        food (Food & Dining), 
        shopping (Shopping), 
        transport (Transportation), 
        bills (Bills & Utilities), 
        entertainment (Entertainment), 
        health (Health & Fitness),
        salary (Salary),
        business (Business)
      `;

      const prompt = `
Bạn là một trợ lý ảo chuyên phân tích và bóc tách các khoản chi tiêu/thu nhập từ câu nói tự nhiên sang định dạng JSON chuẩn.
Hãy đọc câu sau và trích xuất các thông tin:
"${text}"

Danh sách dữ liệu tham khảo:
- Types: ${types}
- Payment Methods: ${paymentMethods}
- Categories: ${categories}

QUY TẮC BÓC TÁCH:
1. "amount": Số tiền (kiểu số nguyên). Ví dụ: "50k" -> 50000, "1 củ" -> 1000000.
2. "type": "expense" nếu là chi tiêu, "income" nếu là thu nhập.
3. "paymentMethod": Tìm phương thức thanh toán phù hợp trong danh sách. Nếu không rõ, chọn "cash". (Ví dụ "quẹt thẻ" -> "credit_card").
4. "categoryId": Chọn 1 ID danh mục phù hợp nhất từ danh sách Categories ở trên.
5. "note": Trích xuất ngắn gọn mục đích (Ví dụ: "Đi Bách Hóa Xanh").
6. "date": Chuỗi ngày theo định dạng YYYY-MM-DD. Hãy tính toán dựa trên ngày hiện tại là ${new Date().toISOString().split('T')[0]}. ("Nay" -> Hôm nay, "Hôm qua" -> Ngày hôm qua).

CHỈ TRẢ VỀ ĐÚNG 1 ĐOẠN MÃ JSON hợp lệ, KHÔNG THÊM BẤT KỲ VĂN BẢN NÀO KHÁC BÊN NGOÀI JSON. Đừng dùng block code (\`\`\`json).
Ví dụ định dạng mong muốn:
{
  "amount": 50000,
  "type": "expense",
  "paymentMethod": "cash",
  "categoryId": "shopping",
  "note": "Đi bách hóa xanh",
  "date": "${new Date().toISOString().split('T')[0]}"
}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let textResponse = response.text().trim();
      
      if (textResponse.startsWith('\`\`\`json')) {
        textResponse = textResponse.replace('\`\`\`json', '').replace('\`\`\`', '').trim();
      } else if (textResponse.startsWith('\`\`\`')) {
        textResponse = textResponse.replace('\`\`\`', '').trim();
      }

      const parsedData = JSON.parse(textResponse);
      return { status: true, data: parsedData };
    } catch (error) {
      console.error('Error parsing transaction with AI:', error);
      throw new InternalServerErrorException('Failed to parse text with AI');
    }
  }
}
