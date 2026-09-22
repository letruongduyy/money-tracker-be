import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { TransactionsService } from '../transactions/transactions.service';
import { AssetsService } from '../assets/assets.service';
import { GoldService } from '../gold/gold.service';
import { DebtsService } from '../debts/debts.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectConnection() private connection: Connection,
    private jwtService: JwtService,
    private transactionsService: TransactionsService,
    private assetsService: AssetsService,
    private goldService: GoldService,
    private debtsService: DebtsService,
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

  async updateAvatar(userId: string, avatarUrl: string) {
    return this.userModel.findByIdAndUpdate(userId, { avatar: avatarUrl }, { returnDocument: 'after' }).select('-password');
  }

  async addFcmToken(userId: string, token: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { fcmToken: token });
  }

  async removeFcmToken(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { fcmToken: '' });
  }

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const { income, expense, balance } = await this.transactionsService.getBalance(userId);
    const assets = await this.assetsService.findAll(userId);
    const debts = await this.debtsService.findAll(userId);

    let goldPrices: any = {};
    let currencyRates: any[] = [];

    try {
      const goldData = await this.goldService.getGoldPrices('SJ9999', 1);
      if (goldData && goldData.length > 0) {
        goldPrices = goldData[0].prices || {};
      }
    } catch (e) {
      console.log('Error fetching gold prices', e);
    }

    try {
      const currencyData = await this.goldService.getCurrencyRates();
      if (currencyData && currencyData.rates) {
        currencyRates = currencyData.rates;
      }
    } catch (e) {
      console.log('Error fetching currency rates', e);
    }

    let cashTotal = 0;
    let goldTotal = 0;
    let currencyTotal = 0;

    for (const asset of assets) {
      if (asset.type === 'cash') {
        cashTotal += asset.amount;
      } else if (asset.type === 'gold') {
        const rawSymbol = asset.symbol || 'SJ9999';
        const symbol = rawSymbol.split(':')[0];
        let buyPrice = 160000000.0;
        const priceEntry = goldPrices[symbol] || (Object.values(goldPrices)[0] as any);
        if (priceEntry) {
          buyPrice = parseFloat(priceEntry.buy?.toString().replace(/,/g, '')) || buyPrice;
        }

        const isChi = (asset as any).unit === 'chi' || rawSymbol.split(':')[1] === 'chi';
        const finalAmount = isChi ? asset.amount / 10 : asset.amount;
        goldTotal += finalAmount * buyPrice;
      } else if (asset.type === 'currency') {
        const symbol = asset.symbol || 'USD';
        let rate = 0.0;
        const rateEntry = currencyRates.find((r: any) => r.currencyCode === symbol);
        if (rateEntry) {
          rate = parseFloat(rateEntry.sell?.toString().replace(/,/g, '')) || 0.0;
        }
        if (rate === 0.0) {
          const defaultRates: Record<string, number> = {
            'USD': 26000.0,
            'EUR': 30000.0,
            'JPY': 170.0,
            'GBP': 35000.0,
            'AUD': 19000.0,
            'CAD': 19000.0,
            'SGD': 20000.0,
            'CNY': 3900.0,
          };
          rate = defaultRates[symbol] || 1.0;
        }
        currencyTotal += asset.amount * rate;
      }
    }

    const totalAssetsValuation = cashTotal + goldTotal + currencyTotal;
    const totalBalance = balance + totalAssetsValuation;

    // Calculate unpaid debts
    let totalLoan = 0;
    let totalDebt = 0;

    const calculateItemValuation = (item: any) => {
      if (!item) return 0;
      if (item.assetType === 'cash') {
        return item.amount || 0;
      } else if (item.assetType === 'gold') {
        const rawSymbol = item.assetSymbol || 'SJ9999';
        const symbol = rawSymbol.split(':')[0];
        let buyPrice = 160000000.0;
        const priceEntry = goldPrices[symbol] || (Object.values(goldPrices)[0] as any);
        if (priceEntry) {
          buyPrice = parseFloat(priceEntry.buy?.toString().replace(/,/g, '')) || buyPrice;
        }
        const isChi = item.assetUnit === 'chi' || rawSymbol.split(':')[1] === 'chi';
        const finalAmount = isChi ? (item.amount || 0) / 10 : (item.amount || 0);
        return finalAmount * buyPrice;
      } else if (item.assetType === 'currency') {
        const symbol = item.assetSymbol || 'USD';
        let rate = 0.0;
        const rateEntry = currencyRates.find((r: any) => r.currencyCode === symbol);
        if (rateEntry) {
          rate = parseFloat(rateEntry.sell?.toString().replace(/,/g, '')) || 0.0;
        }
        if (rate === 0.0) {
          const defaultRates: Record<string, number> = {
            'USD': 26000.0,
            'EUR': 30000.0,
            'JPY': 170.0,
            'GBP': 35000.0,
            'AUD': 19000.0,
            'CAD': 19000.0,
            'SGD': 20000.0,
            'CNY': 3900.0,
          };
          rate = defaultRates[symbol] || 1.0;
        }
        return (item.amount || 0) * rate;
      }
      return 0;
    };

    for (const d of debts) {
      if (!d.isPaid) {
        let itemsTotal = 0;
        if (d.items && Array.isArray(d.items)) {
          for (const it of d.items) {
            itemsTotal += calculateItemValuation(it);
          }
        }
        let paymentsTotal = 0;
        if (d.payments && Array.isArray(d.payments)) {
          for (const p of d.payments) {
            paymentsTotal += calculateItemValuation(p);
          }
        }
        const remainingValuation = Math.max(0, itemsTotal - paymentsTotal);
        if (d.type === 'debt') {
          totalDebt += remainingValuation;
        } else {
          totalLoan += remainingValuation;
        }
      }
    }

    const netWorthWithDebts = totalBalance + totalLoan - totalDebt;

    return {
      name: user.name,
      avatar: user.avatar,
      username: user.username,
      netWorth: totalBalance,
      totalBalance,
      netWorthWithDebts,
      transactions: {
        income,
        expense,
        balance,
      },
      assets: {
        totalValuation: totalAssetsValuation,
        breakdown: {
          cash: cashTotal,
          gold: goldTotal,
          currency: currencyTotal,
        },
      },
      debts: {
        totalLoan,
        totalDebt,
      },
    };
  }

  async findAllWithStats() {
    const users = await this.userModel.find().select('-password').sort({ createdAt: -1 });
    const usersWithStats: any[] = [];
    for (const user of users) {
      let transactionCount = 0;
      let assetCount = 0;
      let noteCount = 0;

      try {
        transactionCount = await this.connection.model('Transaction').countDocuments({ user: user._id });
      } catch (e) {}

      try {
        assetCount = await this.connection.model('Asset').countDocuments({ user: user._id });
      } catch (e) {}

      try {
        noteCount = await this.connection.model('Note').countDocuments({ user: user._id });
      } catch (e) {}

      usersWithStats.push({
        id: user._id,
        username: user.username,
        name: user.name,
        avatar: user.avatar,
        createdAt: (user as any).createdAt,
        stats: {
          transactions: transactionCount,
          assets: assetCount,
          notes: noteCount,
        }
      });
    }
    return usersWithStats;
  }

  async updateSettings(userId: string, settings: { notificationHour?: number }) {
    const update: any = {};
    if (settings.notificationHour !== undefined) {
      if (settings.notificationHour < 0 || settings.notificationHour > 23) {
        throw new Error('notificationHour must be between 0 and 23');
      }
      update.notificationHour = settings.notificationHour;
    }
    return this.userModel
      .findByIdAndUpdate(userId, update, { returnDocument: 'after' })
      .select('-password');
  }

  async deleteUserCascade(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const models = ['Transaction', 'Note', 'Budget', 'Asset', 'RecurringTransaction', 'Credential', 'Debt'];
    for (const modelName of models) {
      try {
        const model = this.connection.model(modelName);
        await model.deleteMany({ user: userId });
      } catch (e) {
        console.error(`Could not delete cascade for model ${modelName}:`, e);
      }
    }

    await this.userModel.findByIdAndDelete(userId);
    return { success: true, message: 'User deleted and all associated data pruned successfully' };
  }
}
