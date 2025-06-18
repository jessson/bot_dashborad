import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import dayjs, { Dayjs } from 'dayjs';
import { fetchWithAuth } from '../../utils/fetchWithAuth';
import { CHAIN_LIST } from '../../config';

// 类型声明
export interface TradeInfo {
    id: number;
    chain: string;
    builder: string;
    hash: string;
    vicHashes: string[];
    gross: number;
    bribe: number;
    income: number;
    txCount: number;
    ratio: number;
    extraInfo: string;
    tags?: string[];
    created_at: string;
}

export interface PoolInfo {
    symbol: string;
    address: string;
    counter: number;
}

export interface TopInfo {
    chain: string;
    pools: PoolInfo[];
    builders: { name: string; address: string; counter: number }[];
}

export interface UIProfitInfo {
    ratio: number;
    income: number;
}

export interface ProfitInfo {
    income: number;
    gross: number;
    txCount: number;
}

export interface ProfitEvent {
    chain: string;
    today: ProfitInfo;
    yesterday: ProfitInfo;
    thisWeek: ProfitInfo;
    lastWeek: ProfitInfo;
    thisMonth: ProfitInfo;
    lastMonth: ProfitInfo;
}

export interface TagProfitInfo {
    chain: string;
    tag: string;
    total_profit: number;
}

export interface WarnningInfo {
    id: number;
    create_at: string;
    type: string;
    msg: string;
    chain: string;
    delete?: boolean;
}

export const SORT_FIELDS = [
    { label: '收益', value: 'income' },
    { label: '毛利', value: 'gross' },
    { label: '贿赂', value: 'bribe' },
    { label: '比例', value: 'ratio' },
    { label: '最新', value: 'created_at' },
];

export const ITEM_HEIGHT = 120; // 你可以根据实际 tradeCard 高度调整
export const itemSizeMap = {} as { [key: number]: number };
export const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

export function useTransactionListPC() {
    // 状态声明
    const [bufferVersion, setBufferVersion] = useState(0);
    const [socketBuffer, setSocketBuffer] = useState<Map<string, TradeInfo[]>>(new Map());
    const [queryBuffer, setQueryBuffer] = useState<Map<string, TradeInfo[]>>(new Map());
    const [displayTrades, setDisplayTrades] = useState<TradeInfo[]>([]);
    const [sortField, setSortField] = useState<string>('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [keyword, setKeyword] = useState<string>('');
    const [tag, setTag] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [currentChain, setCurrentChain] = useState(CHAIN_LIST[0].toLowerCase());
    const [isPaused, setIsPaused] = useState(false);
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
    const [topInfo, setTopInfo] = useState<Record<string, TopInfo>>({});
    const [tagProfits, setTagProfits] = useState<TagProfitInfo[]>([]);
    const [dayProfit, setDayProfit] = useState<Record<string, UIProfitInfo>>({});
    const [yesterdayProfit, setYesterdayProfit] = useState<Record<string, UIProfitInfo>>({});
    const [monthProfit, setMonthProfit] = useState<Record<string, UIProfitInfo>>({});
    const [lastWeekProfit, setLastWeekProfit] = useState<Record<string, UIProfitInfo>>({});
    const [lastMonthProfit, setLastMonthProfit] = useState<Record<string, UIProfitInfo>>({});
    const [warnings, setWarnings] = useState<WarnningInfo[]>([]);

    const currentChainRef = useRef(currentChain);
    const isPausedRef = useRef(isPaused);

    // 创建 socket 实例
    const socketRef = useRef<ReturnType<typeof io> | null>(null);

    // 页面加载时获取所有信息
    useEffect(() => {
        fetchProfits();
        fetchTagProfits();
        fetchTrades(currentChain);
        // 获取历史数据
        fetchWithAuth('/api/history')
            .then(res => res.json())
            .then(data => {
                if (data.tops && data.tops.length > 0) {
                    const topMap: Record<string, TopInfo> = {};
                    data.tops.forEach((t: TopInfo) => {
                        topMap[t.chain.toLowerCase()] = t;
                    });
                    setTopInfo(topMap);
                }
                if (data.warnings && data.warnings.length > 0) {
                    setWarnings(data.warnings.slice(0, 50));
                }
            })
            .catch(error => {
                console.error('Failed to fetch history data:', error);
            });
    }, []); // 空依赖数组，只在组件挂载时执行一次

    // 初始化 socket 连接
    useEffect(() => {
        const isDev = process.env.NODE_ENV === 'development';
        const wsHost = isDev ? 'localhost:3000' : window.location.hostname;
        const protocol = isDev ? 'ws' : 'wss';
        const socket = io(`${protocol}://${wsHost}`, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling'],
        query: {
            _t: Date.now()
        }
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            // console.log('WebSocket connected');
        });

        socket.on('serverConnected', (data) => {
            // console.log('Server connected:', data);
        });

        socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
        });

        socket.on('disconnect', (reason) => {
            // console.log('WebSocket disconnected:', reason);
        });

        // 监听新交易
        socket.on('newTrade', (trade: TradeInfo) => {
            const chain = trade.chain.toLowerCase();
            setSocketBuffer(prev => {
                const map = new Map(prev);
                const arr = map.get(chain) || [];
                map.set(chain, [...arr, trade].slice(-200));
                return map;
            });
            notifyBufferUpdated();
        });

        // 监听预警
        socket.on('newWarning', (warning: WarnningInfo) => {
            setWarnings(prev => [...prev, warning].slice(-50));
        });

        // 监听热门池子更新
        socket.on('topUpdate', (top: TopInfo) => {
            setTopInfo(prev => ({
                ...prev,
                [top.chain?.toLowerCase?.() || 'unknown']: top
            }));
        });

        // 监听标签收益更新
        socket.on('tagProfitUpdate', (tagProfit: TagProfitInfo[]) => {
            setTagProfits(tagProfit);
        });

        // 监听合并后的收益推送
        socket.on('profitUpdate', (profitArray: ProfitEvent[]) => {
            setProfitInfo(profitArray);
        });

        // 组件卸载时断开连接
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, []); // 空依赖数组，只在组件挂载时执行一次

    // 更新 ref
    useEffect(() => {
        currentChainRef.current = currentChain;
    }, [currentChain]);

    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    // useEffect(() => {
    //     if (!isPaused) {
    //         console.log('useEffect socketBuffer', socketBuffer);
    //         setDisplayTrades([...(socketBuffer.get(currentChain) || [])]);
    //     }
    // }, [isPaused, currentChain, socketBuffer]);

    function setProfitInfo(profitArray: ProfitEvent[]) {
        const day: Record<string, UIProfitInfo> = {};
        const yesterday: Record<string, UIProfitInfo> = {};
        const month: Record<string, UIProfitInfo> = {};
        const lastWeek: Record<string, UIProfitInfo> = {};
        const lastMonth: Record<string, UIProfitInfo> = {};
        for (const profit of profitArray) {
            day[profit.chain] = {income: profit.today.income, ratio: profit.today.gross === 0 ? 0 : (profit.today.income / profit.today.gross)};
            yesterday[profit.chain] = {income: profit.yesterday.income, ratio: profit.yesterday.gross === 0 ? 0 : (profit.yesterday.income / profit.yesterday.gross)};
            month[profit.chain] = {income: profit.thisMonth.income, ratio: profit.thisMonth.gross === 0 ? 0 : (profit.thisMonth.income / profit.thisMonth.gross)};
            lastWeek[profit.chain] = {income: profit.lastWeek.income, ratio: profit.lastWeek.gross === 0 ? 0 : (profit.lastWeek.income / profit.lastWeek.gross)};
            lastMonth[profit.chain] = {income: profit.lastMonth.income, ratio: profit.lastMonth.gross === 0 ? 0 : (profit.lastMonth.income / profit.lastMonth.gross)};
        }

        setDayProfit(day);
        setYesterdayProfit(yesterday);    
        setMonthProfit(month);
        setLastWeekProfit(lastWeek);
        setLastMonthProfit(lastMonth);
    }

    function notifyBufferUpdated() {
        setBufferVersion((v) => v + 1);
    }
    
    useEffect(() => {
        if (isPaused) {
            setDisplayTrades(queryBuffer.get(currentChain) || []);
        } else {
            setDisplayTrades(socketBuffer.get(currentChain) || []);
        }
    }, [isPaused, currentChain, bufferVersion]);

    // 方法定义
    const fetchTrades = async (chain: string, params: any = {}) => {
        const lowerChain = chain.toLowerCase();
        console.log('fetchTrades', lowerChain, params);
        setLoading(true);
        try {
            const url = new URL('/api/trade/search', window.location.origin);
            url.searchParams.set('chain', lowerChain);
            url.searchParams.set('limit', '1000');
            if (params.keyword) url.searchParams.set('keyword', params.keyword);
            if (params.tag) url.searchParams.set('tag', params.tag);
            if (params.sort) url.searchParams.set('sort', params.sort);
            if (params.order) url.searchParams.set('order', params.order);
            if (params.start) url.searchParams.set('start', params.start);
            if (params.end) url.searchParams.set('end', params.end);
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
            const res = await fetch(url.toString(), { headers });
            const data = await res.json();
            // console.log('fetchTrades', data);
            // reverse后再展示，保证最新数据在最前
            const reversed = Array.isArray(data) ? data.slice().reverse() : data;
            if (params.isQuery) {
                setQueryBuffer(prev => {
                    const map = new Map(prev);
                    map.set(lowerChain, reversed);
                    return new Map(map);
                });
                notifyBufferUpdated();
            } else {
                setSocketBuffer(prev => {
                    const map = new Map(prev);
                    map.set(lowerChain, reversed);
                    return new Map(map);
                });
                notifyBufferUpdated();
            }
        } catch (e) {
            setSocketBuffer(prev => {
                const map = new Map(prev);
                map.set(lowerChain, []);
                return new Map(map);
            });
            notifyBufferUpdated();
        } finally {
            setLoading(false);
        }
    };

    const fetchTagProfits = async () => {
        try {
            const res = await fetchWithAuth('/api/tag/daily-profit');
            const data = await res.json();
            setTagProfits(data);
        } catch (e) {
            console.error('Failed to fetch tag profits:', e);
        }
    };

    const fetchProfits = async () => {
        try {
            // 获取当日/昨日/本月收益
            const profitRes = await fetchWithAuth('/api/profit');
            if (!profitRes.ok) {
                console.error('Failed to fetch profit data:', profitRes.status);
                return;
            }
            const profitArray: ProfitEvent[] = await profitRes.json();
            setProfitInfo(profitArray);
        } catch (error) {
            console.error('Error fetching profit data:', error);
            // 如果是 token 过期，可以在这里处理登出逻辑
            if (error instanceof Error && error.message.includes('token')) {
                // 可以在这里调用登出函数
                // logout();
            }
        }
    };

    const handleChainChange = (chain: string) => {
        const lower = chain.toLowerCase();
        setCurrentChain(lower);
        fetchTrades(lower);
    };

    const handleSort = (field: string, order: 'asc' | 'desc') => {
        setSortField(field);
        setSortOrder(order);
        fetchTrades(currentChain, {
            keyword: keyword.trim(),
            tag: tag.trim(),
            sort: field,
            order,
        });
    };

    const handleSearch = () => {
        setIsPaused(true);
        fetchTrades(currentChain, {
            keyword: keyword.trim(),
            tag: tag.trim(),
            sort: sortField,
            order: sortOrder,
            isQuery: true,
        });
    };

    const handlePause = () => {
        setIsPaused(true);
        setQueryBuffer(prev => {
            const map = new Map(prev);
            map.set(currentChain, socketBuffer.get(currentChain) || []);
            return map;
        });
        notifyBufferUpdated();
    }

    const handleResume = () => {
        setIsPaused(false);
    }

    const handleWarningDelete = async (id: number) => {
        try {
            await fetchWithAuth(`/api/warning/${id}`, {
                method: 'DELETE',
            });
            setWarnings(prev => prev.filter(w => w.id !== id));
        } catch (e) {
            console.error('Failed to delete warning:', e);
        }
    };

    // 导出所有状态和方法
    return {
        // 状态
        socketBuffer, setSocketBuffer,
        queryBuffer, setQueryBuffer,
        displayTrades, setDisplayTrades,
        sortField, setSortField,
        sortOrder, setSortOrder,
        keyword, setKeyword,
        tag, setTag,
        loading, setLoading,
        currentChain, setCurrentChain,
        isPaused, setIsPaused,
        dateRange, setDateRange,
        topInfo, setTopInfo,
        tagProfits, setTagProfits,
        dayProfit, setDayProfit,
        yesterdayProfit, setYesterdayProfit,
        monthProfit, setMonthProfit,
        lastWeekProfit, setLastWeekProfit,
        lastMonthProfit, setLastMonthProfit,
        warnings, setWarnings,
        // 方法
        fetchTrades,
        fetchTagProfits,
        fetchProfits,
        handleChainChange,
        handleSort,
        handleSearch,
        handlePause,
        handleResume,
        handleWarningDelete,
    };
} 