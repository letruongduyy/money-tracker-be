import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { TransactionsService } from '../transactions/transactions.service';
import { AssetsService } from '../assets/assets.service';
import { GoldService } from '../gold/gold.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private transactionsService: TransactionsService,
    private assetsService: AssetsService,
    private goldService: GoldService,
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

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const { balance } = await this.transactionsService.getBalance(userId);
    const assets = await this.assetsService.findAll(userId);

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

    let netWorth = balance;

    for (const asset of assets) {
      if (asset.type === 'cash') {
        netWorth += asset.amount;
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
        netWorth += finalAmount * buyPrice;
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
        netWorth += asset.amount * rate;
      }
    }

    return {
      name: user.name,
      netWorth,
    };
  }
}
