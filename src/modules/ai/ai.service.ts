import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { TransactionsService } from "../transactions/transactions.service";
import { NotesService } from "../notes/notes.service";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly notesService: NotesService,
  ) {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      this.logger.warn("GROQ_API_KEY is not set in the environment variables");
    }
  }

  /**
   * AI JSON generator powered by Groq Cloud (Ultra-fast ~0.3s, LPU hardware)
   */
  private async generateJson(prompt: string): Promise<any> {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      throw new InternalServerErrorException("GROQ_API_KEY is not configured");
    }

    const groqModel = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
    const startTime = Date.now();

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          {
            role: "system",
            content:
              "You are an expert AI assistant that strictly responds in valid JSON. Do not include markdown code blocks (```json) or any explanatory text outside the JSON object.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      const errBody = await response.text();
      this.logger.error(`[Groq AI] Request failed (${response.status}): ${errBody}`);
      throw new InternalServerErrorException(`Groq AI request failed with status ${response.status}`);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new InternalServerErrorException("Groq AI returned an empty response");
    }

    const latency = Date.now() - startTime;
    this.logger.log(`[Groq AI] Processed successfully in ${latency}ms using model: ${groqModel}`);
    return JSON.parse(this.cleanJsonString(content));
  }

  private cleanJsonString(text: string): string {
    let cleaned = text.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace("```json", "").replace("```", "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace("```", "").trim();
    }
    return cleaned;
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

      const parsedData = await this.generateJson(prompt);

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

  async parseNoteFromText(text: string, clientTime: string, userId: string) {
    try {
      const prompt = `
Bạn là một trợ lý ảo chuyên phân tích và phân loại các ghi chú/nhắc nhở từ câu nói tự nhiên sang định dạng JSON chuẩn.
Hãy đọc câu sau:
"${text}"

QUY TẮC BÓC TÁCH:
1. Xác định xem người dùng có muốn đặt lời nhắc/hẹn giờ/báo thức hay không (ví dụ: "nhắc tôi...", "lúc...", "15p nữa...", "ngày mai lúc...", "hẹn...", "báo thức...").
2. Nếu CÓ đặt lời nhắc:
   - "isReminder": true
   - "remindAt": Tính toán ngày giờ chính xác theo định dạng ISO 8601 tương đối với thời gian hiện tại của client là ${clientTime}.
     Ví dụ: nếu clientTime là 2026-06-05T15:45:00.000, và người dùng nói "15p nữa đi mua rau", thì remindAt sẽ là "2026-06-05T16:00:00.000". Hãy cố gắng quy đổi chính xác theo múi giờ.
   - "title": Tên/Tiêu đề ngắn gọn của lời nhắc (ví dụ: "Đi mua rau").
   - "content": Nội dung mô tả chi tiết nếu có (nếu không có thì trả về giống title hoặc để trống).
3. Nếu KHÔNG đặt lời nhắc (ví dụ: "bộ phim này hay quá, nó trên netflix"):
   - "isReminder": false
   - "remindAt": null
   - "title": Đặt một tiêu đề tóm tắt ngắn gọn và phù hợp cho ghi chú (ví dụ: "Nhận xét phim" hoặc "Gợi ý phim hay").
   - "content": Nội dung ghi chú (chính là toàn bộ câu nhập vào hoặc nội dung đã được làm sạch).

CHỈ TRẢ VỀ ĐÚNG 1 ĐOẠN MÃ JSON hợp lệ, KHÔNG THÊM BẤT KỲ VĂN BẢN NÀO KHÁC BÊN NGOÀI JSON. Đừng dùng block code (\`\`\`json).
Ví dụ định dạng mong muốn:
{
  "isReminder": true,
  "title": "Đi mua rau",
  "content": "Mua rau nấu canh chua",
  "remindAt": "2026-06-05T16:00:00.000Z"
}
`;

      const parsedData = await this.generateJson(prompt);

      // Safely extract fields — AI may return null for any of them
      const title = "Nhắc nhở";
      const contentText: string = parsedData.content || parsedData.title || text;

      // Wrap the content in Quill Delta JSON format (use actual \n, not \\n)
      const deltaContent = JSON.stringify([{ insert: contentText + "\n" }]);

      const createNoteDto: any = {
        title,
        content: deltaContent,
        isList: false,
        isPinned: false,
      };

      if (parsedData.isReminder && parsedData.remindAt) {
        createNoteDto.remindAt = new Date(parsedData.remindAt).toISOString();
        createNoteDto.isReminderCompleted = false;
        createNoteDto.isReminderSent = false;
      }

      const savedNote = await this.notesService.create(createNoteDto, userId);

      return { status: true, data: savedNote };
    } catch (error: any) {
      console.error("Error parsing note with AI:", error);
      throw new InternalServerErrorException(
        "Failed to parse note with AI: " + error.message,
      );
    }
  }
}

