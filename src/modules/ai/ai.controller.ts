import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AiService } from "./ai.service";

@Controller("ai")
@UseGuards(AuthGuard("jwt"))
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("parse")
  async parseTransaction(@Body("text") text: string, @Req() req: any) {
    if (!text || text.trim() === "") {
      return { status: false, message: "Text is required" };
    }

    const userId = req.user?.userId;
    return this.aiService.parseTransactionFromNote(text, userId);
  }

  @Post("parse-note")
  async parseNote(
    @Body("text") text: string,
    @Body("clientTime") clientTime: string,
    @Req() req: any,
  ) {
    if (!text || text.trim() === "") {
      return { status: false, message: "Text is required" };
    }

    const userId = req.user?.userId;
    return this.aiService.parseNoteFromText(text, clientTime || new Date().toISOString(), userId);
  }
}
