import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

export interface FcmPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    if (admin.apps.length > 0) {
      return; // already initialized
    }

    const serviceAccountPath =
      this.configService.get<string>("FIREBASE_SERVICE_ACCOUNT_PATH") ||
      "../src/firebase/money-tracker-1zzabc-firebase-adminsdk-fbsvc-c7eeb72f23.json";

    // Option 1: load from JSON file
    if (serviceAccountPath) {
      const resolvedPath = path.resolve(process.cwd(), serviceAccountPath);
      this.logger.log(`Firebase service account path: ${resolvedPath}`);
      if (fs.existsSync(resolvedPath)) {
        const serviceAccount = JSON.parse(
          fs.readFileSync(resolvedPath, "utf8"),
        );
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.logger.log(
          "Firebase Admin SDK initialized via service account file",
        );
        return;
      }
      this.logger.warn(
        `Service account file not found at ${resolvedPath}. Trying env vars…`,
      );
    }

    // Option 2: load from individual env vars
    const projectId = this.configService.get<string>("FIREBASE_PROJECT_ID");
    const clientEmail = this.configService.get<string>("FIREBASE_CLIENT_EMAIL");
    const privateKey = this.configService
      .get<string>("FIREBASE_PRIVATE_KEY")
      ?.replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      this.logger.log(
        "Firebase Admin SDK initialized via environment variables",
      );
      return;
    }

    this.logger.error(
      "Firebase Admin SDK NOT initialized — provide FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY",
    );
  }

  /**
   * Send a push notification to a single FCM token.
   */
  async sendToDevice(token: string, payload: FcmPayload): Promise<string> {
    const message: admin.messaging.Message = {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data,
      android: { priority: "high" },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } },
      },
    };

    return admin.messaging().send(message);
  }

  /**
   * Send a push notification to multiple FCM tokens (up to 500 per call).
   */
  async sendToDevices(
    tokens: string[],
    payload: FcmPayload,
  ): Promise<admin.messaging.BatchResponse> {
    if (!tokens.length) {
      return { responses: [], successCount: 0, failureCount: 0 };
    }

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data,
      android: { priority: "high" },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } },
      },
    };

    return admin.messaging().sendEachForMulticast(message);
  }

  /**
   * Send a push notification to a FCM topic.
   */
  async sendToTopic(topic: string, payload: FcmPayload): Promise<string> {
    const message: admin.messaging.Message = {
      topic,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data,
      android: { priority: "high" },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } },
      },
    };

    return admin.messaging().send(message);
  }
}
