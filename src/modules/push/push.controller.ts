import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PushService } from './push.service';
import { RegisterTokenDto } from './dto/register-token.dto';

@Controller('push')
@UseGuards(AuthGuard('jwt'))
export class PushController {
  constructor(private readonly pushService: PushService) {}

  /**
   * POST /push/register-token
   * Save (overwrite) the caller's FCM device token.
   */
  @Post('register-token')
  @HttpCode(HttpStatus.OK)
  async registerToken(@Request() req, @Body() dto: RegisterTokenDto) {
    await this.pushService.registerToken(req.user.userId, dto.token);
    return { message: 'FCM token registered successfully' };
  }

  /**
   * DELETE /push/register-token
   * Clear the caller's FCM device token (e.g. on logout).
   */
  @Delete('register-token')
  @HttpCode(HttpStatus.OK)
  async unregisterToken(@Request() req) {
    await this.pushService.unregisterToken(req.user.userId);
    return { message: 'FCM token unregistered successfully' };
  }

  /**
   * POST /push/send
   * Admin: Send a push notification to a specific user.
   */
  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendPushNotification(@Request() req, @Body() dto: { userId: string; title: string; body: string; data?: Record<string, string> }) {
    if (req.user.username !== 'admin') {
      throw new ForbiddenException('Only admin can access this resource');
    }
    const result = await this.pushService.sendToUser(dto.userId, {
      title: dto.title,
      body: dto.body,
      data: dto.data,
    });
    return result;
  }

  /**
   * POST /push/broadcast
   * Admin: Broadcast a push notification to all users.
   */
  @Post('broadcast')
  @HttpCode(HttpStatus.OK)
  async broadcastPushNotification(@Request() req, @Body() dto: { title: string; body: string; data?: Record<string, string> }) {
    if (req.user.username !== 'admin') {
      throw new ForbiddenException('Only admin can access this resource');
    }
    const result = await this.pushService.sendToAllUsers({
      title: dto.title,
      body: dto.body,
      data: dto.data,
    });
    return result;
  }
}
