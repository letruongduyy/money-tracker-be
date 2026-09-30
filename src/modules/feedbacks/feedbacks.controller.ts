import { Controller, Post, Get, Delete, Body, Param, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FeedbacksService } from './feedbacks.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Controller('feedback')
@UseGuards(AuthGuard('jwt'))
export class FeedbacksController {
  constructor(private readonly service: FeedbacksService) {}

  @Post()
  async create(@Body() body: CreateFeedbackDto, @Req() req) {
    return this.service.create(body, req.user.userId);
  }

  @Get()
  async findAll(@Req() req) {
    if (req.user.username !== 'admin') {
      throw new ForbiddenException('Only admin can access this resource');
    }
    return this.service.findAll();
  }

  @Delete(':id')
  async remove(@Req() req, @Param('id') id: string) {
    if (req.user.username !== 'admin') {
      throw new ForbiddenException('Only admin can access this resource');
    }
    return this.service.remove(id);
  }
}
