import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
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

  async parseTransactionFromNote(
    text: string,
    userId: string,
    clientTime?: string,
  ) {
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

      // Combine parsed date with clientTime's hours & minutes if no specific time was provided
      const clientDate = (clientTime && !isNaN(new Date(clientTime).getTime()))
        ? new Date(clientTime)
        : new Date();

      if (parsedData.date) {
        if (typeof parsedData.date === "string" && parsedData.date.length === 10) {
          const [year, month, day] = parsedData.date.split("-").map(Number);
          const combined = new Date(clientDate);
          combined.setFullYear(year, month - 1, day);
          parsedData.date = combined.toISOString();
        }
      } else {
        parsedData.date = clientDate.toISOString();
      }

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

  /**
   * Classify a free-form spoken sentence into one of 7 intents and extract
   * preview fields WITHOUT saving anything. The client shows a preview and
   * saves via the normal local-first flows after the user confirms.
   */
  async smartParse(text: string, clientTime: string) {
    const now = clientTime || new Date().toISOString();

    const prompt = `
Bạn là trợ lý AI phân loại & bóc tách dữ liệu cho ứng dụng quản lý chi tiêu cá nhân.
Câu người dùng (có thể tiếng Việt hoặc tiếng Anh): "${text}"
Thời gian hiện tại của người dùng (phía client): ${now}

Một câu có thể chứa NHIỀU ý độc lập (nhiều giao dịch, vừa giao dịch vừa nhắc nhở...). Hãy tách câu thành các mục, mỗi mục phân loại vào ĐÚNG MỘT trong các loại sau:
- "transaction": chi tiêu hoặc thu nhập một lần (mua gì, trả gì, ăn gì, nhận lương, được cho tiền...)
- "recurring": giao dịch định kỳ lặp lại (hằng ngày/tuần/tháng/năm; VD "mỗi tháng trả tiền nhà 5 triệu", "hàng tuần đổ xăng 200k")
- "note": ghi chú/ghi nhớ thông thường không kèm mốc thời gian nhắc (VD "bộ phim này hay quá", "mua sách kinh tế")
- "reminder": nhắc nhở CÓ mốc thời gian (VD "nhắc tôi 15 phút nữa gọi mẹ", "hẹn mai 9h họp", "báo thức 6h sáng mai")
- "debt": vay nợ — gồm cả "tôi đi vay" và "tôi cho vay/ai nợ tôi"
- "budget": đặt ngân sách/hạn mức chi tiêu cho một danh mục (VD "đặt ngân sách ăn uống tháng này 3 triệu")
- "asset": thêm tài sản (tiền mặt, vàng, ngoại tệ, sổ tiết kiệm; VD "tôi có 2 chỉ vàng SJC", "mở sổ tiết kiệm 50 triệu kỳ hạn 6 tháng")
- "unknown": không đủ rõ ràng để phân loại

QUY TẮC TÁCH MỤC:
- Mỗi ý độc lập là một mục riêng, tối đa 5 mục.
- Câu chỉ có 1 ý thì trả về mảng đúng 1 mục.
- Chỉ dùng "unknown" khi TOÀN BỘ câu không phân loại được; khi đó trả về đúng 1 mục unknown với fields {"text": "<câu gốc>"} và KHÔNG tạo mục khác.
- Mục nào thiếu dữ liệu quan trọng (thiếu số tiền với transaction/recurring/budget/asset/debt, thiếu thông tin với debt) thì BỎ mục đó, không đoán bừa.

QUY TẮC BÓC TÁCH THEO TỪNG LOẠI (đặt trong "fields"):

A. transaction / recurring:
- "amount": số nguyên. Quy đổi tiếng lóng: "50k"/"50 nghìn"/"50 ngàn" -> 50000; "1 củ"/"1 triệu"/"1tr" -> 1000000; "rưỡi" cộng thêm nửa đơn vị (VD "1 triệu rưỡi" -> 1500000).
- "type": "expense" (chi tiêu) hoặc "income" (thu nhập).
- "paymentMethod": CHỈ CHỌN 1 TRONG: cash, card, e_wallet, bank_transfer (mặc định cash).
- "category": CHỈ CHỌN 1 TRONG danh sách phù hợp với type:
  + income: salary, freelance, gift, investment, other
  + expense: food_and_dining, transport, shopping, entertainment, bills_and_utilities, health, education, baby, give_someone_money, save_money, other
- "note": mô tả ngắn gọn mục đích (VD "Đi Bách Hóa Xanh").
- "date": chuỗi ngày YYYY-MM-DD tính theo thời gian client ("hôm qua", "mai"...).
- Riêng recurring THÊM: "frequency": daily|weekly|monthly|yearly, và "startDate": YYYY-MM-DD.

B. note:
- "title": tiêu đề ngắn gọn tóm tắt nội dung.
- "content": nội dung đầy đủ (giữ nguyên ngôn ngữ người dùng nhập).

C. reminder:
- "title": tiêu đề ngắn (VD "Gọi mẹ").
- "content": nội dung chi tiết.
- "remindAt": thời điểm ISO 8601 tính chính xác từ thời gian client ${now} (VD client là 2026-06-05T15:45:00.000Z và nói "15 phút nữa" -> "2026-06-05T16:00:00.000Z").

D. debt:
- "type": "debt" nếu TÔI đi vay (tôi nợ người khác), "loan" nếu tôi cho người khác vay.
- "personName": tên người liên quan.
- "items": mảng các khoản [{ "assetType": cash|gold|currency, "amount": số, "assetSymbol": mã (VD "SJC", "USD"), "assetUnit": đơn vị (VD "chỉ", "lượng") }] — chỉ thêm assetSymbol/assetUnit khi là vàng hoặc ngoại tệ.
- "startDate": YYYY-MM-DD (mặc định hôm nay), "dueDate": YYYY-MM-DD nếu có hẹn trả.
- "note": ghi chú thêm nếu có.

E. budget:
- "category": danh mục ngân sách — ưu tiên khớp với danh sách expense ở trên nếu đúng nghĩa, ngược lại giữ nguyên cụm danh mục người dùng nói.
- "amount": số nguyên dương.
- "month": 1-12, "year": YYYY (mặc định tháng/năm hiện tại theo thời gian client nếu người dùng không nói rõ).

F. asset:
- "type": cash|gold|currency|savings.
- "name": tên tài sản (VD "Tiền mặt", "Vàng SJC", "USD", "Sổ tiết kiệm VCB").
- "amount": số lượng hoặc số tiền.
- "symbol": mã (VD "SJC", "USD") nếu có; "unit": đơn vị (VD "chỉ", "lượng") nếu có.
- "termMonths": kỳ hạn tính bằng tháng (chỉ savings); "interestRate": lãi suất %/năm (chỉ savings) nếu có.

CHỈ TRẢ VỀ ĐÚNG 1 ĐOẠN MÃ JSON hợp lệ, KHÔNG THÊM BẤT KỲ VĂN BẢN NÀO KHÁC BÊN NGOÀI JSON. Đừng dùng block code (\`\`\`json).
Định dạng mong muốn:
{
  "items": [
    {
      "intent": "transaction",
      "fields": {
        "amount": 50000,
        "type": "expense",
        "paymentMethod": "cash",
        "category": "shopping",
        "note": "Đi bách hóa xanh",
        "date": "${now.split("T")[0]}"
      }
    },
    {
      "intent": "reminder",
      "fields": {
        "title": "Họp",
        "content": "Mai đi họp lúc 9 giờ",
        "remindAt": "${now.split("T")[0]}T09:00:00.000Z"
      }
    }
  ]
}
`;

    const parsedData = await this.generateJson(prompt);
    const items = this.sanitizeSmartParse(parsedData, text, now);
    this.logger.log(
      `[Smart Parse] items=${items.map((it: any) => it.intent).join(",")}`,
    );
    // Top-level intent/fields mirror the first item so older app builds
    // (which read a single intent) keep working.
    return {
      status: true,
      data: { items, intent: items[0].intent, fields: items[0].fields },
    };
  }

  private sanitizeSmartParse(raw: any, text: string, clientTime: string) {
    const rawItems = Array.isArray(raw?.items)
      ? raw.items
      : raw?.intent
        ? [raw]
        : [];
    const items: any[] = rawItems
      .slice(0, 5)
      .map((it: any) =>
        this.sanitizeIntentFields(it?.intent, it?.fields, text, clientTime),
      )
      .filter((it: any) => it !== null);
    return items.length > 0 ? items : [{ intent: "unknown", fields: { text } }];
  }

  private sanitizeIntentFields(
    rawIntent: any,
    f: any,
    text: string,
    clientTime: string,
  ): { intent: string; fields: any } | null {
    const intents = [
      "transaction",
      "recurring",
      "note",
      "reminder",
      "debt",
      "budget",
      "asset",
    ];
    const intent: string =
      typeof rawIntent === "string" ? rawIntent.trim().toLowerCase() : "";
    if (!intents.includes(intent)) return null;
    if (!f || typeof f !== "object") f = {};

    const textOf = (value: any, fallback: string): string =>
      typeof value === "string" && value.trim() ? value.trim() : fallback;

    const amountOf = (value: any): number => {
      const n = Number(value);
      return Number.isFinite(n) ? Math.abs(Math.round(n)) : 0;
    };

    const dateOf = (value: any): string => {
      if (typeof value === "string" && value.trim()) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
      }
      return this.clientDate(clientTime);
    };

    const paymentMethodOf = (value: any): string => {
      const aliases: Record<string, string> = {
        credit_card: "card",
        transfer: "bank_transfer",
        ewallet: "e_wallet",
        "e-wallet": "e_wallet",
      };
      let v = typeof value === "string" ? value.trim().toLowerCase() : "";
      v = aliases[v] ?? v;
      return ["cash", "card", "e_wallet", "bank_transfer"].includes(v)
        ? v
        : "cash";
    };

    const categoryOf = (value: any, type: string): string => {
      const income = ["salary", "freelance", "gift", "investment", "other"];
      const expense = [
        "food_and_dining",
        "transport",
        "shopping",
        "entertainment",
        "bills_and_utilities",
        "health",
        "education",
        "baby",
        "give_someone_money",
        "save_money",
        "other",
      ];
      const v = typeof value === "string" ? value.trim().toLowerCase() : "";
      return (type === "income" ? income : expense).includes(v) ? v : "other";
    };

    switch (intent) {
      case "transaction":
      case "recurring": {
        const type = f.type === "income" ? "income" : "expense";
        const amount = amountOf(f.amount);
        if (amount <= 0) return null;
        const fields: any = {
          amount,
          type,
          paymentMethod: paymentMethodOf(f.paymentMethod),
          category: categoryOf(f.category, type),
          note: textOf(f.note, text),
          date: dateOf(f.date),
        };
        if (intent === "recurring") {
          const frequencies = ["daily", "weekly", "monthly", "yearly"];
          const freq =
            typeof f.frequency === "string"
              ? f.frequency.trim().toLowerCase()
              : "";
          fields.frequency = frequencies.includes(freq) ? freq : "monthly";
          fields.startDate = dateOf(f.startDate || f.date);
        }
        return { intent, fields };
      }
      case "note": {
        return {
          intent,
          fields: {
            title: textOf(f.title, text.slice(0, 60)),
            content: textOf(f.content, text),
          },
        };
      }
      case "reminder": {
        const remindAt =
          typeof f.remindAt === "string" ? new Date(f.remindAt) : null;
        if (!remindAt || isNaN(remindAt.getTime())) {
          // No usable time — keep the content as a plain note instead.
          return {
            intent: "note",
            fields: {
              title: textOf(f.title, text.slice(0, 60)),
              content: textOf(f.content, text),
            },
          };
        }
        return {
          intent,
          fields: {
            title: textOf(f.title, text.slice(0, 60)),
            content: textOf(f.content, text),
            remindAt: remindAt.toISOString(),
          },
        };
      }
      case "debt": {
        const personName = textOf(f.personName, "");
        const rawItems = Array.isArray(f.items) ? f.items : [];
        const items = rawItems
          .map((it: any) => {
            const at =
              typeof it?.assetType === "string"
                ? it.assetType.trim().toLowerCase()
                : "cash";
            return {
              id: randomUUID(),
              assetType: ["cash", "gold", "currency"].includes(at)
                ? at
                : "cash",
              amount: amountOf(it?.amount),
              assetSymbol:
                typeof it?.assetSymbol === "string" && it.assetSymbol.trim()
                  ? it.assetSymbol.trim()
                  : undefined,
              assetUnit:
                typeof it?.assetUnit === "string" && it.assetUnit.trim()
                  ? it.assetUnit.trim()
                  : undefined,
            };
          })
          .filter((it: any) => it.amount > 0);
        if (!personName || items.length === 0) return null;
        const fields: any = {
          type: f.type === "loan" ? "loan" : "debt",
          personName,
          items,
          startDate: dateOf(f.startDate),
        };
        if (typeof f.dueDate === "string" && f.dueDate.trim()) {
          const due = new Date(f.dueDate);
          if (!isNaN(due.getTime())) {
            fields.dueDate = due.toISOString().split("T")[0];
          }
        }
        if (typeof f.note === "string" && f.note.trim()) {
          fields.note = f.note.trim();
        }
        return { intent, fields };
      }
      case "budget": {
        const amount = amountOf(f.amount);
        if (amount <= 0) return null;
        const now = new Date(clientTime);
        const validNow = !isNaN(now.getTime());
        const monthNum = Number(f.month);
        const yearNum = Number(f.year);
        const month =
          Number.isInteger(monthNum) && monthNum >= 1 && monthNum <= 12
            ? monthNum
            : validNow
              ? now.getUTCMonth() + 1
              : new Date().getUTCMonth() + 1;
        const year =
          Number.isInteger(yearNum) && yearNum > 2000
            ? yearNum
            : validNow
              ? now.getUTCFullYear()
              : new Date().getUTCFullYear();
        return {
          intent,
          fields: {
            category: textOf(f.category, "other"),
            amount,
            month,
            year,
          },
        };
      }
      case "asset": {
        const assetTypes = ["cash", "gold", "currency", "savings"];
        const amount = amountOf(f.amount);
        if (amount <= 0) return null;
        const at =
          typeof f.type === "string" ? f.type.trim().toLowerCase() : "cash";
        const fields: any = {
          type: assetTypes.includes(at) ? at : "cash",
          name: textOf(f.name, text.slice(0, 60)),
          amount,
        };
        if (typeof f.symbol === "string" && f.symbol.trim()) {
          fields.symbol = f.symbol.trim();
        }
        if (typeof f.unit === "string" && f.unit.trim()) {
          fields.unit = f.unit.trim();
        }
        if (fields.type === "savings") {
          const term = Number(f.termMonths);
          if (Number.isFinite(term) && term > 0) {
            fields.termMonths = Math.round(term);
          }
          const rate = Number(f.interestRate);
          if (Number.isFinite(rate) && rate >= 0) {
            fields.interestRate = rate;
          }
        }
        return { intent, fields };
      }
      default:
        return null;
    }
  }

  private clientDate(clientTime: string): string {
    const d = new Date(clientTime);
    return (isNaN(d.getTime()) ? new Date() : d).toISOString().split("T")[0];
  }
}

