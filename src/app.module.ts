import "dotenv/config";

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/database.module";

import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { TransactionsModule } from "./modules/transactions/transactions.module";
import { AppConfigModule } from "./modules/app-config/app-config.module";
import { GoldModule } from "./modules/gold/gold.module";
import { NotesModule } from "./modules/notes/notes.module";
import { AssetsModule } from "./modules/assets/assets.module";

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
  ],
})
export class AppModule {}
