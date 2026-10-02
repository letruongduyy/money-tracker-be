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

    let cashTotal = 0;
    let savingsTotal = 0;
    let goldTotal = 0;
    let currencyTotal = 0;

    for (const asset of assets) {
      const val = Number((asset as any).valuation ?? asset.amount) || 0;
      if (asset.type === 'cash') {
        cashTotal += val;
      } else if (asset.type === 'savings') {
        savingsTotal += val;
      } else if (asset.type === 'gold') {
        goldTotal += val;
      } else if (asset.type === 'currency') {
        currencyTotal += val;
      }
    }

    const totalAssetsValuation = cashTotal + savingsTotal + goldTotal + currencyTotal;
    const totalBalance = totalAssetsValuation;

    // Calculate unpaid debts
    let totalLoan = 0;
    let totalDebt = 0;

    let goldPrices: any = {};
    let currencyRates: any[] = [];

    const hasGoldDebt = debts.some(
      (d) =>
        !d.isPaid &&
        (d.items?.some((it: any) => it.assetType === 'gold') ||
          d.payments?.some((p: any) => p.assetType === 'gold')),
    );
    const hasCurrencyDebt = debts.some(
      (d) =>
        !d.isPaid &&
        (d.items?.some((it: any) => it.assetType === 'currency') ||
          d.payments?.some((p: any) => p.assetType === 'currency')),
    );

    if (hasGoldDebt) {
      try {
        const pricesRes = await fetch('https://www.vang.today/api/prices');
        if (pricesRes.ok) {
          const pricesData = await pricesRes.json();
          goldPrices = pricesData?.prices || {};
        }
      } catch (e) {
        console.error('Error fetching gold prices for debt valuation:', e);
      }
    }

    if (hasCurrencyDebt) {
      try {
        const currencyData = await this.goldService.getCurrencyRates();
        if (currencyData && currencyData.rates) {
          currencyRates = currencyData.rates;
        }
      } catch (e) {
        console.error('Error fetching currency rates for debt valuation:', e);
      }
    }

    const calculateItemValuation = (item: any) => {
      if (!item) return 0;
      if (item.assetType === 'cash' || item.assetType === 'savings') {
        return Number(item.amount) || 0;
      } else if (item.assetType === 'gold') {
        const rawSymbol = item.assetSymbol || 'SJ9999';
        const cleanSymbol = rawSymbol.split(':')[0];
        const priceEntry = goldPrices[cleanSymbol] || (Object.keys(goldPrices).length > 0 ? Object.values(goldPrices)[0] : null);
        const buyPrice = priceEntry?.buy ? parseFloat(String(priceEntry.buy).replace(/,/g, '')) : 0;
        const isChi = item.assetUnit === 'chi' || (item.assetSymbol && item.assetSymbol.split(':').pop() === 'chi');
        const finalAmount = isChi ? (item.amount || 0) / 10 : (item.amount || 0);
        return buyPrice > 0 ? Math.round(finalAmount * buyPrice) : 0;
      } else if (item.assetType === 'currency') {
        const symbol = item.assetSymbol || 'USD';
        const rateEntry = currencyRates.find((r: any) => r.currencyCode === symbol);
        let rate = rateEntry?.sell ? parseFloat(String(rateEntry.sell).replace(/,/g, '')) : 0.0;
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
        return Math.round((item.amount || 0) * rate);
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

    const netWorthWithDebts = totalAssetsValuation + totalLoan - totalDebt;

    return {
      name: user.name,
      avatar: user.avatar,
      username: user.username,
      netWorth: netWorthWithDebts,
      totalBalance: netWorthWithDebts,
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
          savings: savingsTotal,
          gold: goldTotal,
          currency: currencyTotal,
        },
      },
      debts: {
        totalLoan,
        totalDebt,
      },
      notificationHour: user.notificationHour ?? 23,
      notificationMinute: user.notificationMinute ?? 0,
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

  async updateSettings(userId: string, settings: { notificationHour?: number; notificationMinute?: number; budgetAlertsEnabled?: boolean }) {
    const update: any = {};
    if (settings.notificationHour !== undefined) {
      if (settings.notificationHour < 0 || settings.notificationHour > 23) {
        throw new Error('notificationHour must be between 0 and 23');
      }
      update.notificationHour = settings.notificationHour;
    }
    if (settings.notificationMinute !== undefined) {
      if (settings.notificationMinute < 0 || settings.notificationMinute > 59) {
        throw new Error('notificationMinute must be between 0 and 59');
      }
      update.notificationMinute = settings.notificationMinute;
    }
    if (settings.budgetAlertsEnabled !== undefined) {
      if (typeof settings.budgetAlertsEnabled !== 'boolean') {
        throw new Error('budgetAlertsEnabled must be a boolean');
      }
      update.budgetAlertsEnabled = settings.budgetAlertsEnabled;
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
