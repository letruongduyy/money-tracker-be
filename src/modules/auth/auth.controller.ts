import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('login')
  login(@Body() body: { username: string; password: string; fcmToken?: string }) {
    return this.authService.login(body.username, body.password, body.fcmToken);
  }

  @Post('logout')
  logout() {
    // For stateless JWTs, true invalidation happens by the client deleting the token
    return { message: 'Successfully logged out' };
  }
}
