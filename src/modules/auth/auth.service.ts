import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) { }

  async login(username: string, password: string, fcmToken?: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) throw new UnauthorizedException();

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException();

    const payload = { sub: user._id, username: user.username };

    // Persist FCM token if the client provided one
    if (fcmToken) {
      await this.usersService.addFcmToken(String(user._id), fcmToken);
    }

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        avatar: user.avatar,
      }
    };
  }
}
