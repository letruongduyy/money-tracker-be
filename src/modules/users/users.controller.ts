import { Controller, Post, Body, UseInterceptors, UploadedFile, BadRequestException, Patch, UseGuards, Req, Get, Delete, Param, ForbiddenException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";

@Controller("users")
export class UsersController {
  constructor(private usersService: UsersService) { }

  @Post()
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        return cb(new BadRequestException('Only image files are allowed!'), false);
      }
      cb(null, true);
    }
  }))
  register(@Req() req, @Body() body: CreateUserDto, @UploadedFile() file?: Express.Multer.File) {
    console.log(file);
    if (file) {
      body.avatar = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    }
    return this.usersService.create(body);
  }

  @Patch("me/avatar")
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `avatar-${uniqueSuffix}${ext}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        return cb(new BadRequestException('Only image files are allowed!'), false);
      }
      cb(null, true);
    }
  }))
  async updateAvatar(@Req() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    return this.usersService.updateAvatar(req.user.userId, avatarUrl);
  }

  @Get("me")
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Req() req) {
    return this.usersService.getProfile(req.user.userId);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getAllUsers(@Req() req) {
    if (req.user.username !== 'admin') {
      throw new ForbiddenException('Only admin can access this resource');
    }
    return this.usersService.findAllWithStats();
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async deleteUser(@Req() req, @Param('id') id: string) {
    if (req.user.username !== 'admin') {
      throw new ForbiddenException('Only admin can access this resource');
    }
    return this.usersService.deleteUserCascade(id);
  }
}
