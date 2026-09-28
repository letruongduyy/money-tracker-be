import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AssetsService } from './assets.service';
import { Asset } from './schemas/asset.schema';
import { Types } from 'mongoose';

describe('AssetsService', () => {
  let service: AssetsService;
  let mockAssetModel: any;
  const userId = '507f1f77bcf86cd799439012';

  beforeEach(async () => {
    mockAssetModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      find: jest.fn(),
      deleteOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({
        ...dto,
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        {
          provide: getModelToken(Asset.name),
          useValue: mockAssetModel,
        },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upsertByLocalId', () => {
    it('updates the document when the localId is already known', async () => {
      const updated = { _id: 'doc-1', localId: 'uuid-1', amount: 15 };
      mockAssetModel.findOne.mockResolvedValue({ _id: 'doc-1', localId: 'uuid-1' });
      mockAssetModel.findOneAndUpdate.mockResolvedValue(updated);

      const dto = {
        localId: 'uuid-1',
        type: 'cash',
        name: 'Wallet',
        amount: 15,
      };
      const result = await service.upsertByLocalId(dto as any, userId);

      expect(mockAssetModel.findOne).toHaveBeenCalledTimes(1);
      expect(mockAssetModel.findOne).toHaveBeenCalledWith({
        localId: 'uuid-1',
        user: userId,
      });
      expect(mockAssetModel.findOneAndUpdate).toHaveBeenCalledWith(
        { localId: 'uuid-1', user: userId },
        { $set: dto },
        { returnDocument: 'after' },
      );
      expect(mockAssetModel.create).not.toHaveBeenCalled();
      expect(result).toBe(updated);
    });

    it('creates a new document for an unknown localId instead of semantic merging', async () => {
      mockAssetModel.findOne.mockResolvedValue(null);

      const dto = {
        localId: 'uuid-new',
        type: 'cash',
        name: 'Wallet',
        amount: 15,
      };
      const result = await service.upsertByLocalId(dto as any, userId);

      expect(mockAssetModel.findOne).toHaveBeenCalledTimes(1);
      expect(mockAssetModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(mockAssetModel.create).toHaveBeenCalledWith({
        ...dto,
        user: userId,
      });
      expect(result).toMatchObject({
        localId: 'uuid-new',
        name: 'Wallet',
        amount: 15,
      });
    });

    it('keeps split gold parts separate (new localId is not merged into the existing gold doc)', async () => {
      const existingGold: any = {
        _id: 'gold-1',
        type: 'gold',
        symbol: 'SJ9999',
        name: 'SJ9999',
        amount: 10,
        unit: 'tael',
        save: jest.fn(),
      };
      mockAssetModel.findOne.mockImplementation((filter: any) =>
        Promise.resolve(filter.localId ? null : existingGold),
      );

      const dto = {
        localId: 'uuid-part',
        type: 'gold',
        name: 'SJ9999',
        symbol: 'SJ9999',
        amount: 4,
        unit: 'tael',
      };
      await service.upsertByLocalId(dto as any, userId);

      expect(existingGold.save).not.toHaveBeenCalled();
      expect(existingGold.amount).toBe(10);
      expect(mockAssetModel.create).toHaveBeenCalledWith({
        ...dto,
        user: userId,
      });
    });

    it('still applies semantic merge when no localId is provided', async () => {
      const existingGold: any = {
        type: 'gold',
        symbol: 'SJ9999',
        name: 'SJ9999',
        amount: 10,
        unit: 'tael',
      };
      existingGold.save = jest.fn().mockResolvedValue(existingGold);
      mockAssetModel.findOne.mockResolvedValue(existingGold);

      const dto = {
        type: 'gold',
        name: 'SJ9999',
        symbol: 'SJ9999',
        amount: 4,
        unit: 'tael',
      };
      const result = await service.upsertByLocalId(dto as any, userId);

      expect(mockAssetModel.findOne).toHaveBeenCalledWith({
        user: userId,
        type: 'gold',
      });
      expect(existingGold.amount).toBe(14);
      expect(existingGold.save).toHaveBeenCalled();
      expect(mockAssetModel.create).not.toHaveBeenCalled();
      expect(result).toBe(existingGold);
    });
  });
});
