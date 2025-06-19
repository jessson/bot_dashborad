import 'reflect-metadata';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { AppDataSource } from './data-source';
import { TradeInfo } from './entity/TradeInfo';
import { MoreThanOrEqual } from 'typeorm';
import jwt from 'jsonwebtoken';
import { User } from './entity/User';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { startCleanupTask } from './tasks/cleanup';
import { getProfitForTrades, initProfitCache, loadProfitStats } from './utils/profit';
import {
  CHAINS,
  topInfoMap,
  profitCache,
  tagProfitCache,
  warningCache
} from './utils/cache';
import { Profit } from './entity/Profit';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: '*' },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
});

const JWT_SECRET = process.env.JWT_SECRET || '1234567_secret';

// 鉴权中间件
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/api/welcome' || req.path === '/api/login') return next();
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: '未登录' });
  try {
    jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: '登录已过期' });
  }
}

// 为所有需要认证的路由添加中间件
app.use(authMiddleware);

// 登录接口
app.post('/api/login', async (req, res) => {
  const expiresIn = process.env.JWT_EXPIRES_IN || '4h';
  const { username, password } = req.body;
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOneBy({ username });
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ username, type: user.type }, JWT_SECRET, { expiresIn: expiresIn as any });
    res.json({ token, type: user.type });
  } else {
    res.status(401).json({ error: '用户名或密码错误' });
  }
});

app.get('/api/login', (req, res) => {
  res.status(405).json({ error: 'Method Not Allowed' });
});

// 添加 WebSocket 连接处理
io.on('connection', (socket) => {
  // console.log('Client connected:', socket.id);

  socket.on('disconnect', (reason) => {
    // console.log('Client disconnected:', socket.id, reason);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  // 发送初始数据
  socket.emit('connected', { message: 'Connected to server' });
});


AppDataSource.initialize().then(async () => {
  console.log('start initialized......');
  // 启动时统计当天所有trade累计到cache
  const tradeRepo = AppDataSource.getRepository(TradeInfo);
  const profitRepo = AppDataSource.getRepository(Profit);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  await initProfitCache(profitRepo, tradeRepo);
  // 初始化 tagProfitCache
  const todayTrades = await tradeRepo.find({ where: { created_at: MoreThanOrEqual(today) } });
  for (const chain of CHAINS) {
      tagProfitCache.set(chain, new Map());
  }

  for (const t of todayTrades) {
    const chain = t.chain;
    if (!tagProfitCache.has(chain)) {
      tagProfitCache.set(chain, new Map());
    }
    if (Array.isArray(t.tags)) {
      t.tags.forEach((tag: string) => {
        if (tag.length > 0) {
          tagProfitCache.get(chain)!.set(tag, (tagProfitCache.get(chain)!.get(tag) || 0) + (t.income || 0));
        }
      });
    }
  }
  console.log('tagProfitCache', tagProfitCache);
  console.log('profitCache', profitCache);  
  // await getProfitForTrades("bsc", tradeRepo);
  // 启动定时清理任务
  await startCleanupTask();
  console.log('initialized done!');


  
  function addTradeToCache(t: TradeInfo) {
    const chain = t.chain;
    if (!profitCache.has(chain)) {
      return;
    }

    const todayProft = profitCache.get(chain)!.today;
    todayProft.income += t.income || 0;
    todayProft.gross += t.gross || 0;
    todayProft.txCount += 1;

    let tagCache = tagProfitCache.get(chain);
    if (!tagCache) {
      tagCache = new Map();
      tagProfitCache.set(chain, tagCache);
    }
    t.tags.forEach((tag: string) => {
      tagCache.set(tag, (tagCache.get(tag) || 0) + (t.income || 0));
    });
  }

  function emitTradeEvents() {
    const profitArr: any[] = [];
    const welcomeArr: any[] = [];
    const tagProfitArr: any[] = [];
    for (const c of CHAINS) {
      const cache = profitCache.get(c);
      profitArr.push({
        chain: c,
        today: cache!.today,
        yesterday: cache!.yesterday,
        thisWeek: cache!.thisWeek,
        lastWeek: cache!.lastWeek,
        thisMonth: cache!.thisMonth,
        lastMonth: cache!.lastMonth,
      });
      welcomeArr.push({
        chain: c,
        income: cache!.today.income,
        txCount: cache!.today.txCount,
      });
    }
    for (const [chain, tagCache] of tagProfitCache.entries()) {
      for (const [tag, profit] of tagCache.entries()) {
        tagProfitArr.push({
          chain,
          tag,
          total_profit: profit,
        });
      }
    }
    io.emit('welcomeUpdate', welcomeArr);
    io.emit('profitUpdate', profitArr);
    io.emit('tagProfitUpdate', tagProfitArr);
  }

  // 合并后的 profit 查询接口
  app.get('/api/profit', async (req, res) => {
    const result: any[] = [];
    for (const chain of CHAINS) {
      const cache = profitCache.get(chain)!;
      result.push({
        chain,
        today: cache!.today,
        yesterday: cache!.yesterday,
        thisWeek: cache!.thisWeek,
        lastWeek: cache!.lastWeek,
        thisMonth: cache!.thisMonth,
        lastMonth: cache!.lastMonth,
      });
    }
    res.json(result);
  });

  // TradeInfo
  app.post('/api/trade', async (req, res) => {
    // console.log('[TRADE] newTrade', req.body);
    const repo = AppDataSource.getRepository(TradeInfo);
    let tradeArr: any = [];
    if (Array.isArray(req.body)) {
      tradeArr = repo.create(req.body.map(item => ({ 
        ...item, 
        chain: item.chain?.toLowerCase(),
        tags: Array.isArray(item.tags) ? item.tags : [],
      })));
      await repo.save(tradeArr);
    } else {
      const t = repo.create({ 
        ...req.body, 
        chain: req.body.chain?.toLowerCase(),
        tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      });
    await repo.save(t);
      tradeArr = [t];
    }
    tradeArr.forEach((t: any) => {
      if (!t || typeof t !== 'object') return;
      console.log('newTrade', t.hash);

      const tradeForFrontend = {
        ...t,
        tags: Array.isArray(t.tags) ? t.tags : [],        
        txCount: profitCache.get(t.chain)!.today.txCount,
      };
      try {
        // console.log('[EMIT] newTrade', tradeForFrontend);
        io.emit('newTrade', tradeForFrontend);
      } catch (error) {
        console.error('Failed to emit newTrade:', error);
      }
      // 自动累计到 day/yesterday/month
      addTradeToCache(t);
    });
    emitTradeEvents();
    res.json({ ok: true });
  });

  // Warning推送API
  app.post('/api/warning', (req, res) => {
    const w = { ...req.body, id: ++warningCache.id, create_at: new Date().toISOString(), delete: false };
    warningCache.warningBuffer.push(w);
    if (warningCache.warningBuffer.length > 1000) warningCache.warningBuffer.splice(0, warningCache.warningBuffer.length - 1000);
    io.emit('newWarning', w);
    res.json({ success: true });
  });

  // 删除Warning接口（仅限localhost访问）
  app.delete('/api/warning/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = warningCache.warningBuffer.findIndex(w => w.id === id);
    if (index === -1) {
      return res.status(404).json({ error: '预警不存在' });
    }
    warningCache.warningBuffer[index].delete = true;
    res.json({ success: true });
  });

  // Top
  app.post('/api/top', async (req, res) => {
    const { chain, pools } = req.body;
    const info = {
      chain: chain.toLowerCase(),
      pools,
      created_at: new Date(),
    };
    topInfoMap.set(info.chain, info);
    try {
      // console.log('[EMIT] topUpdate');
      io.emit('topUpdate', info);
    } catch (error) {
      console.error('Failed to emit topUpdate:', error);
    }
    res.json({ ok: true });
  });

  // 查询历史
  app.get('/api/history', async (req, res) => {
    const tradeRepo = AppDataSource.getRepository(TradeInfo);
    const trades = await tradeRepo.find({ order: { created_at: 'DESC' }, take: 100 });
    // 返回给前端的 tags 直接为数组 
    const formattedTrades = trades.map(trade => ({
      ...trade,
      tags: Array.isArray(trade.tags) ? trade.tags : [],
    }));
    const warnings = warningCache.warningBuffer.filter(w => !w.delete).slice(-50).reverse();
    const tops = Array.from(topInfoMap.values());
    // 统计今日、本周、上周、本月、上月、日环比等
    const profits: any[] = [];
    for (const chain of CHAINS) {
      const dayInfo = profitCache.get(chain)!.today;
      const weekInfo = profitCache.get(chain)!.thisWeek;
      const lastWeekInfo = profitCache.get(chain)!.lastWeek;
      const monthInfo = profitCache.get(chain)!.thisMonth;
      const lastMonthInfo = profitCache.get(chain)!.lastMonth;
      profits.push({
        chain,
        day: dayInfo.income,
        dayRatio: dayInfo.gross === 0 ? 0 : (dayInfo.income / dayInfo.gross),
        week: weekInfo.income,
        lastWeek: lastWeekInfo.income,
        month: monthInfo.income,
        lastMonth: lastMonthInfo.income,
      });
    }
    
    // console.log('History', warnings.length);
    res.json({ trades: formattedTrades, warnings, profits, tops });
  });

  // TradeInfo 查询接口
  app.get('/api/trade/search', async (req, res) => {
    const repo = AppDataSource.getRepository(TradeInfo);
    const {
      chain,
      keyword,
      tag,
      sort = 'created_at',
      order = 'desc',
      limit = 500,
      start,
      end,
    } = req.query as any;
    // console.log('req.query', req.query);
    // 防注入：白名单校验
    const SORT_FIELDS = ['income', 'gross', 'bribe', 'ratio', 'created_at', 'id', 'builder', 'hash'];
    const sortField = SORT_FIELDS.includes(sort) ? sort : 'created_at';
    const orderValue = (typeof order === 'string' && order.toLowerCase() === 'asc') ? 'ASC' : 'DESC';
    let limitValue = parseInt(limit, 10);
    if (isNaN(limitValue) || limitValue <= 0 || limitValue > 1000) limitValue = 500;
    
    let qb = repo.createQueryBuilder('trade');

    if (chain && typeof chain === 'string' && chain.length <= 16) {
      qb = qb.andWhere('trade.chain = :chain', { chain });
    }
    if (keyword && typeof keyword === 'string' && keyword.length <= 64) {
      qb = qb.andWhere(
        '(trade.hash LIKE :kw OR trade.builder LIKE :kw OR trade.extraInfo LIKE :kw)',
        { kw: `%${keyword}%` }
      );
    }
    if (tag && typeof tag === 'string' && tag.length <= 32) {
      qb = qb.andWhere('trade.tags LIKE :tag', { tag: `%${tag}%` });
    }
    // 时间段查询
    let startDate, endDate;
    if (start && end) {
      startDate = new Date(start);
      endDate = new Date(end);
    } else {
      // 默认当天
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    }
    qb = qb.andWhere('trade.created_at >= :startDate AND trade.created_at < :endDate', { startDate, endDate });

    qb = qb.orderBy(`trade.${sortField}`, orderValue);
    qb = qb.limit(limitValue);

    const result = await qb.getMany();
    // for (const r of result) {
    //   console.log('r', r.income);
    // }
    // console.log('result', result);/
    // 返回给前端的 tags 直接为数组
    const formattedResult = result.map(trade => ({
      ...trade,
      tags: Array.isArray(trade.tags) ? trade.tags : [],
    }));
    res.json(formattedResult);
  });

  // 每日标签收益统计
  app.get('/api/tag/daily-profit', async (req, res) => {
    const result: any[] = [];
    for (const chain of CHAINS) {
      const tagCache = tagProfitCache.get(chain);
      if (!tagCache) continue;
      for (const [tag, profit] of tagCache.entries()) {
        result.push({
          chain,
          tag,
          total_profit: profit,
        });
      }
    }
    res.json(result);
  });

  // WelcomeInfo接口
  app.get('/api/welcome', async (req, res) => {
    // 直接返回内存缓存
    const result: any[] = [];
    for (const chain of CHAINS) {
      const cache = profitCache.get(chain)!;
      result.push({
        chain: chain,
        income: cache!.today.income,
        txCount: cache!.today.txCount,
      });
    }
    res.json(result);
  });

  server.listen(process.env.API_PORT || 7000, () => {
    console.log(`Server started on http://localhost:${process.env.API_PORT || 7000}`);
  });
}); 