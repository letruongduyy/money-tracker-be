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

  async mergeOrCreate(data: CreateAssetDto, userId: string): Promise<AssetDocument> {
    if (data.type === 'gold') {
      const cleanSymbol = data.symbol ? data.symbol.split(':')[0] : '';
      const existing = await this.assetModel.findOne({
        user: userId,
        type: 'gold',
      });
      
      if (existing) {
        // Convert existing amount to tael (lượng)
        const isExistingChi = existing.unit === 'chi' || (existing.symbol && existing.symbol.split(':').pop() === 'chi');
        const existingTael = isExistingChi ? existing.amount / 10 : existing.amount;
        
        // Convert incoming amount to tael (lượng)
        const isIncomingChi = data.unit === 'chi' || (data.symbol && data.symbol.split(':').pop() === 'chi');
        const incomingTael = isIncomingChi ? data.amount / 10 : data.amount;
        
        // Update existing to Lượng only
        existing.amount = existingTael + incomingTael;
        existing.unit = 'tael';
        if (cleanSymbol && cleanSymbol !== '') {
          existing.symbol = cleanSymbol;
          existing.name = cleanSymbol;
        } else if (!existing.symbol || existing.symbol === '') {
          existing.symbol = 'SJ9999';
          existing.name = 'SJ9999';
        }
        
        existing.updatedAt = new Date();
        return existing.save();
      }
    }
    
    if (data.type === 'currency') {
      const cleanSymbol = data.symbol ? data.symbol.split(':')[0] : 'USD';
      const existing = await this.assetModel.findOne({
        user: userId,
        type: 'currency',
        $or: [
          { symbol: cleanSymbol },
          { symbol: '' },
          { symbol: null }
        ]
      });
      if (existing) {
        existing.amount = existing.amount + data.amount;
        existing.symbol = cleanSymbol;
        existing.name = cleanSymbol;
        existing.updatedAt = new Date();
        return existing.save();
      }
    }

    if (data.type === 'cash' && data.name) {
      const trimmedName = data.name.trim();
      const existing = await this.assetModel.findOne({
        user: userId,
        type: 'cash',
        name: { $regex: new RegExp(`^${trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
      });
      if (existing) {
        existing.amount = existing.amount + data.amount;
        existing.updatedAt = new Date();
        return existing.save();
      }
    }
    
    return this.assetModel.create({
      ...data,
      user: userId,
    });
  }

  async create(data: CreateAssetDto, userId: string) {
    return this.mergeOrCreate(data, userId);
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
      const existingByLocalId = await this.assetModel.findOne({
        localId: data.localId,
        user: userId,
      });
      if (existingByLocalId) {
        return this.assetModel.findOneAndUpdate(
          { localId: data.localId, user: userId },
          { $set: data },
          { returnDocument: 'after' }
        );
      }
    }
    return this.mergeOrCreate(data, userId);
  }
}
