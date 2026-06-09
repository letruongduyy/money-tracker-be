import "dotenv/config";

import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI!, {
      tls: true,
      tlsAllowInvalidCertificates: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }),
  ],
})
export class DatabaseModule {}
