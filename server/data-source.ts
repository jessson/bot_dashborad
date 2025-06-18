import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { TradeInfo } from './entity/TradeInfo';
import { User } from './entity/User';
import { Profit } from './entity/Profit';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'arb_bots.db',
  synchronize: true,
  logging: false,
  entities: [TradeInfo, User, Profit],
}); 