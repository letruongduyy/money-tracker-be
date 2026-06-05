import "dotenv/config";

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/database.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { TransactionsModule } from "./modules/transactions/transactions.module";
import { AppConfigModule } from "./modules/app-config/app-config.module";
import { GoldModule } from "./modules/gold/gold.module";
import { NotesModule } from "./modules/notes/notes.module";
import { AssetsModule } from "./modules/assets/assets.module";
import { AiModule } from "./modules/ai/ai.module";
import { FirebaseModule } from "./firebase/firebase.module";
import { PushModule } from "./modules/push/push.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { ScheduleModule } from "@nestjs/schedule";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ".env",
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    TransactionsModule,
    AppConfigModule,
    GoldModule,
    NotesModule,
    AssetsModule,
    AiModule,
    FirebaseModule,
    PushModule,
    ScheduleModule.forRoot(),
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
