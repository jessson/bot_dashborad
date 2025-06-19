import { Profit } from '../entity/Profit';
import { startOfDay, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { Between, Repository } from 'typeorm';
import { TradeInfo } from '../entity/TradeInfo';
import { CHAINS, profitCache } from './cache';

interface ProfitInfo {
  gross: number;
  income: number;
  txCount: number;
}

export interface ProfitStats {
  today: ProfitInfo;
  yesterday: ProfitInfo;
  thisWeek: ProfitInfo;
  lastWeek: ProfitInfo;
  thisMonth: ProfitInfo;
  lastMonth: ProfitInfo;
}


export async function initProfitCache(profitRepo: Repository<Profit>, tradeRepo: Repository<TradeInfo>) {
  for (const chain of CHAINS) {
    const stats = await loadProfitStats(chain, profitRepo);
    console.log('loadProfitStats', chain);
    profitCache.set(chain, stats);
    const todayProfit = profitCache.get(chain)!.today;
    const thisWeekProfit = profitCache.get(chain)!.thisWeek;
    if (todayProfit.txCount == thisWeekProfit.txCount) {
      console.log('getProfitForTrades', chain);
      const stats = await getProfitForTrades(chain, tradeRepo);
      const profitStat = profitCache.get(chain)!
      profitStat.today = stats.today;
      profitStat.yesterday = stats.yesterday;
      profitStat.thisWeek = stats.thisWeek;
      profitStat.thisMonth = stats.thisMonth;
    }
  }
}

export async function getProfitForTrades(chain: string, tradeRepository: Repository<TradeInfo>): Promise<{
  today: ProfitInfo;
  yesterday: ProfitInfo;
  thisWeek: ProfitInfo;
  thisMonth: ProfitInfo;
}> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = startOfDay(subDays(now, 1));
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  // 获取今日数据
  const todayTrades = await tradeRepository.find({
    where: {
      chain,
      created_at: Between(todayStart, now)
    }
  });

  // 获取昨日数据
  const yesterdayTrades = await tradeRepository.find({
    where: {
      chain,
      created_at: Between(yesterdayStart, todayStart)
    }
  });

  // 获取本周数据
  const thisWeekTrades = await tradeRepository.find({
    where: {
      chain,
      created_at: Between(weekStart, now)
    }
  });

  // 获取本月数据
  const thisMonthTrades = await tradeRepository.find({
    where: {
      chain,
      created_at: Between(monthStart, now)
    }
  });

  // 计算统计数据
  const calculateStats = (trades: TradeInfo[]): ProfitInfo => {
    return {
      gross: trades.reduce((sum, trade) => sum + (trade.gross || 0), 0),
      income: trades.reduce((sum, trade) => sum + (trade.income || 0), 0),
      txCount: trades.length
    };
  };

  return {
    today: calculateStats(todayTrades),
    yesterday: calculateStats(yesterdayTrades),
    thisWeek: calculateStats(thisWeekTrades),
    thisMonth: calculateStats(thisMonthTrades)
  };
}

export const loadProfitStats = async (chain: string, profitRepo: Repository<Profit>): Promise<ProfitStats> => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = startOfDay(subDays(now, 1));
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subDays(now, 30));

  // 获取今日数据
  const today = await profitRepo.find({
    where: {
      chain,
      created_at: Between(todayStart, now)
    }
  });

  // 获取昨日数据
  const yesterday = await profitRepo.find({
    where: {
      chain,
      created_at: Between(yesterdayStart, todayStart)
    }
  });

  // 获取本周数据（从周一开始）
  const thisWeek = await profitRepo.find({
    where: {
      chain,
      created_at: Between(weekStart, now)
    }
  });

  // 获取上周数据（从周一开始）
  const lastWeek = await profitRepo.find({
    where: {
      chain,
      created_at: Between(lastWeekStart, weekStart)
    }
  });

  // 获取本月数据
  const thisMonth = await profitRepo.find({
    where: {
      chain,
      created_at: Between(monthStart, now)
    }
  });

  // 获取上月数据
  const lastMonth = await profitRepo.find({
    where: {
      chain,
      created_at: Between(lastMonthStart, monthStart)
    }
  });

  // 计算统计数据
  const calculateStats = (profits: Profit[]) => {
    return {
      gross: profits.reduce((sum, profit) => sum + Number(profit.gross), 0),
      income: profits.reduce((sum, profit) => sum + Number(profit.income), 0),
      txCount: profits.reduce((sum, profit) => sum + profit.txCount, 0)
    };
  };

  return {
    today: calculateStats(today),
    yesterday: calculateStats(yesterday),
    thisWeek: calculateStats(thisWeek),
    lastWeek: calculateStats(lastWeek),
    thisMonth: calculateStats(thisMonth),
    lastMonth: calculateStats(lastMonth)
  };
}; 