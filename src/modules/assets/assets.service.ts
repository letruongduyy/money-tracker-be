import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset, AssetDocument } from './schemas/asset.schema';
import { CreateAssetDto, UpdateAssetDto } from './dto/asset.dto';

@Injectable()
export class AssetsService {
  constructor(
    @InjectModel(Asset.name)
    private assetModel: Model<AssetDocument>,
  ) {}

  async create(data: CreateAssetDto, userId: string) {
    return this.assetModel.create({
      ...data,
      user: userId,
    });
  }

  async findAll(userId: string) {
    return this.assetModel.find({ user: userId }).sort({ updatedAt: -1 });
  }

  async update(id: string, data: UpdateAssetDto, userId: string) {
    return this.assetModel.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: data },
      { returnDocument: 'after' },
    );
  }

  async remove(id: string, userId: string) {
    return this.assetModel.deleteOne({ _id: id, user: userId }).exec();
  }

  async removeByLocalId(localId: string, userId: string) {
    return this.assetModel.deleteOne({ localId, user: userId }).exec();
  }

  async upsertByLocalId(data: CreateAssetDto, userId: string) {
    if (data.localId) {
       return this.assetModel.findOneAndUpdate(
         { localId: data.localId, user: userId },
         { $set: data },
         { upsert: true, returnDocument: 'after' }
       );
    }
    return this.create(data, userId);
  }
}
