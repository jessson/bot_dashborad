import { ProfitStats } from "./profit";

export const CHAINS = ['bsc', 'sol', 'eth', 'sui'];

export interface WarningInfo {
  id: number;
  create_at: string;
  type: string;
  msg: string;
  chain: string;
  delete: boolean;
}

export interface WarningCache {
  id: number;
  warningBuffer: WarningInfo[];
}

// 用于保存最新的 TopInfo（内存）
export const topInfoMap = new Map(); // key: chain, value: TopInfo
// 收益内存缓存
export const profitCache = new Map<string, ProfitStats>();
// tag收益内存缓存
// chain->(tag->profit)
export const tagProfitCache: Map<string, Map<string, number>> = new Map();
// Warning内存缓存
export const warningCache: WarningCache = {
  id: 0,
  warningBuffer: [],
};
