import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User, UserDocument } from "../users/schemas/user.schema";
import { FirebaseService, FcmPayload } from "../../firebase/firebase.service";

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private firebaseService: FirebaseService,
  ) {}

  /**
   * Save (overwrite) the FCM token for a user.
   */
  async registerToken(userId: string, token: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { fcmToken: token });
  }

  /**
   * Clear the FCM token for a user (e.g. on logout).
   */
  async unregisterToken(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { fcmToken: "" });
  }

  /**
   * Send a push notification to the registered device of a specific user.
   */
  async sendToUser(
    userId: string,
    payload: FcmPayload,
  ): Promise<{ success: boolean }> {
    const user = await this.userModel.findById(userId).select("fcmToken");
    if (!user) throw new NotFoundException("User not found");

    const token: string = user.fcmToken ?? "";
    if (!token) {
      this.logger.warn(`User ${userId} has no FCM token registered`);
      return { success: false };
    }

    try {
      await this.firebaseService.sendToDevice(token, payload);
      return { success: true };
    } catch (err: any) {
      const code = err?.errorInfo?.code;

      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
      ) {
        await this.userModel.findByIdAndUpdate(userId, { fcmToken: "" });
        this.logger.log(`Pruned stale FCM token for user ${userId}`);
      }

      return { success: false };
    }
  }

  /**
   * Broadcast a push notification to ALL users who have an FCM token.
   */
  async sendToAllUsers(
    payload: FcmPayload,
  ): Promise<{ successCount: number; failureCount: number }> {
    const users = await this.userModel
      .find({ fcmToken: { $exists: true, $ne: "" } })
      .select("_id fcmToken");

    let successCount = 0;
    let failureCount = 0;

    for (const user of users) {
      const result = await this.sendToUser(String(user._id), payload);
      result.success ? successCount++ : failureCount++;
    }

    return { successCount, failureCount };
  }
}
