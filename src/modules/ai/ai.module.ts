import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { TransactionsModule } from "../transactions/transactions.module";
import { NotesModule } from "../notes/notes.module";

@Module({
  imports: [TransactionsModule, NotesModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
