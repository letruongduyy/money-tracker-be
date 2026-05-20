import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { FirebaseService, FcmPayload } from '../../firebase/firebase.service';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private firebaseService: FirebaseService,
  ) {}

  /**
   * Register an FCM token for the given user (idempotent — no duplicates).
   */
  async registerToken(userId: string, token: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $addToSet: { fcmTokens: token },
    });
  }

  /**
   * Remove an FCM token from the given user's token list.
   */
  async unregisterToken(userId: string, token: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $pull: { fcmTokens: token },
    });
  }

  /**
   * Send a push notification to all registered devices of a specific user.
   */
  async sendToUser(
    userId: string,
    payload: FcmPayload,
  ): Promise<{ successCount: number; failureCount: number }> {
    const user = await this.userModel.findById(userId).select('fcmTokens');
    if (!user) throw new NotFoundException('User not found');

    const tokens: string[] = user.fcmTokens ?? [];
    if (!tokens.length) {
      this.logger.warn(`User ${userId} has no FCM tokens registered`);
      return { successCount: 0, failureCount: 0 };
    }

    // FCM supports up to 500 tokens per multicast — chunk if needed
    const CHUNK_SIZE = 500;
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunk = tokens.slice(i, i + CHUNK_SIZE);
      const response = await this.firebaseService.sendToDevices(chunk, payload);
      successCount += response.successCount;
      failureCount += response.failureCount;

      // Prune invalid tokens returned by FCM
      const invalidTokens: string[] = [];
      response.responses.forEach((r, idx) => {
        if (
          !r.success &&
          (r.error?.code === 'messaging/registration-token-not-registered' ||
            r.error?.code === 'messaging/invalid-registration-token')
        ) {
          invalidTokens.push(chunk[idx]);
        }
      });

      if (invalidTokens.length) {
        await this.userModel.findByIdAndUpdate(userId, {
          $pull: { fcmTokens: { $in: invalidTokens } },
        });
        this.logger.log(
          `Pruned ${invalidTokens.length} stale FCM token(s) for user ${userId}`,
        );
      }
    }

    return { successCount, failureCount };
  }

  /**
   * Broadcast a push notification to ALL users who have at least one FCM token.
   */
  async sendToAllUsers(
    payload: FcmPayload,
  ): Promise<{ successCount: number; failureCount: number }> {
    const users = await this.userModel
      .find({ fcmTokens: { $exists: true, $not: { $size: 0 } } })
      .select('_id fcmTokens');

    let successCount = 0;
    let failureCount = 0;

    for (const user of users) {
      const result = await this.sendToUser(String(user._id), payload);
      successCount += result.successCount;
      failureCount += result.failureCount;
    }

    return { successCount, failureCount };
  }
}
