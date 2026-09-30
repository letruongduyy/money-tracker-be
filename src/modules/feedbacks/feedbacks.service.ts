import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Feedback, FeedbackDocument } from './schemas/feedback.schema';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class FeedbacksService {
  constructor(
    @InjectModel(Feedback.name) private feedbackModel: Model<FeedbackDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(dto: CreateFeedbackDto, userId: string): Promise<FeedbackDocument> {
    return this.feedbackModel.create({
      user: new Types.ObjectId(userId),
      rating: dto.rating,
      category: dto.category || 'suggestion',
      message: dto.message,
      appVersion: dto.appVersion || '',
      platform: dto.platform || '',
    });
  }

  async findAll(): Promise<any[]> {
    const feedbacks = await this.feedbackModel
      .find()
      .sort({ createdAt: -1 })
      .populate('user', 'username name avatar')
      .lean();

    return feedbacks.map((f) => ({
      ...f,
      id: (f as any)._id.toString(),
    }));
  }

  async remove(id: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Feedback not found');
    }
    return this.feedbackModel.deleteOne({ _id: new Types.ObjectId(id) }).exec();
  }
}
