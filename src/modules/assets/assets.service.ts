import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset, AssetDocument } from './schemas/asset.schema';
import { CreateAssetDto, UpdateAssetDto } from './dto/asset.dto';
import { GoldService } from '../gold/gold.service';

@Injectable()
export class AssetsService {
  constructor(
    @InjectModel(Asset.name)
    private assetModel: Model<AssetDocument>,
    private goldService: GoldService,
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
    const assets = await this.assetModel.find({ user: userId }).sort({ updatedAt: -1 });
    return this.enrichWithValuations(assets);
  }

  private async enrichWithValuations(assets: AssetDocument[]) {
    if (!assets || assets.length === 0) return [];

    let goldPrices: Record<string, any> = {};
    let currencyRates: Array<any> = [];

    const hasGold = assets.some((a) => a.type === 'gold');
    const hasCurrency = assets.some((a) => a.type === 'currency');

    if (hasGold) {
      try {
        const pricesRes = await fetch('https://www.vang.today/api/prices');
        if (pricesRes.ok) {
          const pricesData = await pricesRes.json();
          goldPrices = pricesData?.prices || {};
        }
      } catch (err) {
        console.error('Error fetching gold prices for asset valuation:', err);
      }
    }

    if (hasCurrency) {
      try {
        const currData = await this.goldService.getCurrencyRates();
        currencyRates = currData?.rates || [];
      } catch (err) {
        console.error('Error fetching currency rates for asset valuation:', err);
      }
    }

    return assets.map((asset) => {
      const obj = asset.toObject ? asset.toObject() : { ...asset };
      let valuation = 0;

      if (asset.type === 'cash' || asset.type === 'savings') {
        valuation = Number(asset.amount) || 0;
      } else if (asset.type === 'gold') {
        const rawSymbol = asset.symbol || 'SJ9999';
        const cleanSymbol = rawSymbol.split(':')[0];
        const priceEntry = goldPrices[cleanSymbol] || (Object.keys(goldPrices).length > 0 ? Object.values(goldPrices)[0] : null);
        const buyPrice = priceEntry?.buy ? parseFloat(String(priceEntry.buy).replace(/,/g, '')) : 0;

        const isChi = asset.unit === 'chi' || (asset.symbol && asset.symbol.split(':').pop() === 'chi');
        const tael = isChi ? asset.amount / 10 : asset.amount;
        valuation = buyPrice > 0 ? Math.round(tael * buyPrice) : 0;
      } else if (asset.type === 'currency') {
        const sym = asset.symbol || 'USD';
        const rateEntry = currencyRates.find((r) => r.currencyCode === sym);
        const sellRate = rateEntry?.sell ? parseFloat(String(rateEntry.sell).replace(/,/g, '')) : 0;
        valuation = sellRate > 0 ? Math.round(asset.amount * sellRate) : 0;
      }

      return {
        ...obj,
        valuation,
      };
    });
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
      // Sync is idempotent by localId; semantic merging here would collapse split parts.
      return this.assetModel.create({
        ...data,
        user: userId,
      });
    }
    return this.mergeOrCreate(data, userId);
  }
}
