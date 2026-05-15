import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) { }

  async create(createUserDto: CreateUserDto) {
    const { username, password, name, avatar } = createUserDto;
    const exists = await this.userModel.findOne({ username });
    if (exists) throw new ConflictException('Username exists');

    const hashed = await bcrypt.hash(password, 10);
    const user = await this.userModel.create({ username, password: hashed, name, avatar });

    const payload = { sub: user._id, username: user.username };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        avatar: user.avatar,
      },
    };
  }

  async findByUsername(username: string) {
    return this.userModel.findOne({ username });
  }
}
