import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { PushService } from './push.service';
import { PushController } from './push.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [PushService],
  controllers: [PushController],
  exports: [PushService],
})
export class PushModule {}
