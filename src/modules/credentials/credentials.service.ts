import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Credential, CredentialDocument } from './schemas/credential.schema';
import { CreateCredentialDto, UpdateCredentialDto } from './dto/credential.dto';

@Injectable()
export class CredentialsService {
  private readonly logger = new Logger(CredentialsService.name);

  constructor(
    @InjectModel(Credential.name)
    private credentialModel: Model<CredentialDocument>,
  ) {}

  async create(createDto: CreateCredentialDto, userId: string): Promise<Credential> {
    try {
      const created = new this.credentialModel({
        ...createDto,
        user: new Types.ObjectId(userId),
      });
      return created.save();
    } catch (error) {
      this.logger.error('Failed to create credential', error as Error);
      throw error;
    }
  }

  async update(
    id: string,
    updateDto: Partial<CreateCredentialDto>,
    userId: string,
  ): Promise<Credential> {
    try {
      const updateData = { ...updateDto };

      if (Types.ObjectId.isValid(id)) {
        const updated = await this.credentialModel
          .findOneAndUpdate(
            { _id: new Types.ObjectId(id), user: new Types.ObjectId(userId) },
            { $set: updateData },
            { returnDocument: 'after' },
          )
          .exec();

        if (updated) {
          return updated;
        }

        this.logger.warn(
          `Credential ${id} not found for user ${userId} — creating a new one instead`,
        );
      } else {
        this.logger.warn(
          `Invalid ObjectId "${id}" — creating a new credential instead`,
        );
      }

      // Fallback: create a new credential with the provided data
      const created = new this.credentialModel({
        ...updateData,
        user: new Types.ObjectId(userId),
      });
      return created.save();
    } catch (error) {
      this.logger.error(`Failed to update credential ${id}`, error as Error);
      throw error;
    }
  }

  async findAll(userId: string): Promise<Credential[]> {
    try {
      return this.credentialModel
        .find({ user: new Types.ObjectId(userId) })
        .sort({ updatedAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error(
        `Failed to find credentials for user ${userId}`,
        error as Error,
      );
      throw error;
    }
  }

  async findOne(id: string, userId: string): Promise<Credential> {
    try {
      const credential = await this.credentialModel
        .findOne({
          _id: new Types.ObjectId(id),
          user: new Types.ObjectId(userId),
        })
        .exec();

      if (!credential) {
        throw new NotFoundException('Credential not found');
      }
      return credential;
    } catch (error) {
      this.logger.error(`Failed to find credential ${id}`, error as Error);
      throw error;
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      const result = await this.credentialModel
        .deleteOne({
          _id: new Types.ObjectId(id),
          user: new Types.ObjectId(userId),
        })
        .exec();

      if (result.deletedCount === 0) {
        throw new NotFoundException('Credential not found');
      }
    } catch (error) {
      this.logger.error(`Failed to remove credential ${id}`, error as Error);
      throw error;
    }
  }
}
