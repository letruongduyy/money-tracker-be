import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { AiService } from "./ai.service";

@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("parse")
  @HttpCode(HttpStatus.OK)
  async parseTransaction(@Body("text") text: string) {
    if (!text || text.trim() === "") {
      return { status: false, message: "Text is required" };
    }
    return this.aiService.parseTransactionFromNote(text);
  }
}
