import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
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
   * Register the caller's FCM device token.
   */
  @Post('register-token')
  @HttpCode(HttpStatus.OK)
  async registerToken(@Request() req, @Body() dto: RegisterTokenDto) {
    await this.pushService.registerToken(req.user.userId, dto.token);
    return { message: 'FCM token registered successfully' };
  }

  /**
   * DELETE /push/register-token
   * Unregister the caller's FCM device token (e.g., on logout).
   */
  @Delete('register-token')
  @HttpCode(HttpStatus.OK)
  async unregisterToken(@Request() req, @Body() dto: RegisterTokenDto) {
    await this.pushService.unregisterToken(req.user.userId, dto.token);
    return { message: 'FCM token unregistered successfully' };
  }
}
