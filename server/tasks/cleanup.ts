import cron from 'node-cron';
import { AppDataSource } from '../data-source';
import { TradeInfo } from '../entity/TradeInfo';
import { Profit } from '../entity/Profit';
import { subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns';
import { CHAINS, profitCache, tagProfitCache } from '../utils/cache';
import { Between } from 'typeorm';
import { initProfitCache } from 'server/utils/profit';



export const startCleanupTask = async () => {
  // 每天凌晨 0 点执行清理任务
  cron.schedule('0 0 * * *', async () => {
    try {
      const tradeRepository = AppDataSource.getRepository(TradeInfo);
      const profitRepository = AppDataSource.getRepository(Profit);
      const now = new Date();
      // 计算两周前的时间点
      const twoWeeksAgo = subWeeks(now, 2);
      // 计算两个月前的时间点
      const twoMonthsAgo = subMonths(now, 2);
      
      // 删除两周前的 trade 数据
      await tradeRepository
        .createQueryBuilder()
        .delete()
        .from(TradeInfo)
        .where('created_at < :date', { date: twoWeeksAgo })
        .execute();

      // 删除两个月前的 profit 数据
      await profitRepository
        .createQueryBuilder()
        .delete()
        .from(Profit)
        .where('created_at < :date', { date: twoMonthsAgo })
        .execute();
      
      tagProfitCache.clear();
      // 重新加载profitCache
      await initProfitCache(profitRepository, tradeRepository);
      console.log(`[${now.toISOString()}] Cleaned up trades older than ${twoWeeksAgo.toISOString()} and profits older than ${twoMonthsAgo.toISOString()}`);
    } catch (error) {
      console.error('Error cleaning up:', error);
    }
  });

  // 每分钟更新当日 profit 信息
  cron.schedule('* * * * *', async () => {
    try {
      const profitRepository = AppDataSource.getRepository(Profit);
      const todayStart = startOfDay(new Date());
      
      // 更新或创建今日 profit 记录
      const now = new Date();
      for (const chain of CHAINS) {
        const todayProfit = await profitRepository.findOne({
          where: {
            chain,
            created_at: Between(startOfDay(now), endOfDay(now))
          }
        });

        const liveProfit = profitCache.get(chain)!.today;

        if (todayProfit) {
          // 更新现有记录
          await profitRepository.update(todayProfit.id, {
            chain: chain,
            gross: liveProfit.gross,
            income: liveProfit.income,
            txCount: liveProfit.txCount
          });
        } else {
          // 创建新记录
          await profitRepository.save({
            chain,
            gross: liveProfit.gross,
            income: liveProfit.income,
            txCount: liveProfit.txCount,
            created_at: todayStart
          });
        }
      }
    } catch (error) {
      console.error('Error updating profit stats:', error);
    }
  });
}; 