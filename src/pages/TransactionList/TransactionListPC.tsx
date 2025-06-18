import React, { useEffect, useState, useRef } from 'react';
import { Layout, Menu, Input, Select, Button, DatePicker, Tooltip, Row, Col, Card, List, Typography, Space, Tag } from 'antd';
import styles from './index.less';
import dayjs, { Dayjs } from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import { WarningFloat } from './WarningFloatPC';
import { CHAIN_LIST } from '../../config';
import { useTransactionListPC, SORT_FIELDS, itemSizeMap } from './useTransactionListPC';
import type { TradeInfo } from './useTransactionListPC';
import VirtualList from 'rc-virtual-list';

const { Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Sider, Content } = Layout;

// Tag 颜色函数，需放在 renderTradeCard 之前
const getTagColor = (tag: string): string => {
  const colors: Record<string, string> = {
    'flashloan': 'red',
    'sandwich': 'orange',
    'arbitrage': 'green',
    'liquidation': 'purple',
    'frontrun': 'cyan',
    'backrun': 'blue',
    'mev': 'volcano',
    'defi': 'geekblue',
    'dex': 'lime',
    'amm': 'gold',
    'yield': 'magenta',
    'lending': 'processing',
    'bridge': 'success',
    'nft': 'warning',
    'gaming': 'error',
    'social': 'default',
  };
  return colors[tag.toLowerCase()] || 'default';
};

const ITEM_ESTIMATED_HEIGHT = 140;

const getItemSize = (index: number) => itemSizeMap[index] || ITEM_ESTIMATED_HEIGHT;

interface VirtualRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    items: TradeInfo[];
    resetAfterIndex: (index: number, shouldForceUpdate?: boolean) => void;
  };
}

const VirtualRow: React.FC<VirtualRowProps> = ({ index, style, data }): JSX.Element => {
  const ref = useRef<HTMLDivElement>(null);
  const { resetAfterIndex, items } = data;
  useEffect(() => {
    if (ref.current) {
      const height = ref.current.getBoundingClientRect().height;
      if (itemSizeMap[index] !== height) {
        itemSizeMap[index] = height;
        if (resetAfterIndex) resetAfterIndex(index);
      }
    }
  }, [items[index], index]);
  return (
    <div style={style} ref={ref}>
      {renderTradeCard(items[index])}
    </div>
  );
};

const TradeCard = ({ trade }: { trade: TradeInfo }) => {
  const { user } = useAuth();
  const isAdmin = user?.type === 'admin';
  const isGuess = user?.type === 'guess';

  // 计算 ratio
  const calculateRatio = (ratio: number) => {
    if (!ratio || isNaN(ratio)) return '0.00%';
    return `${ratio.toFixed(2)}%`;
  };

  // 获取交易链接
  const getTransactionLink = (hash: string, chain?: string) => {
    const baseUrls: Record<string, string> = {
      'eth': 'https://etherscan.io/tx/',
      'bsc': 'https://bscscan.com/tx/',
      'sol': 'https://solscan.io/tx/'
    };
    
    // 默认使用 eth 链接
    const baseUrl = chain ? baseUrls[chain.toLowerCase()] || baseUrls.eth : baseUrls.eth;
    return `${baseUrl}${hash}`;
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '24px' }}>
        {/* 第一行 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Tag color="orange">TxCount: {trade.txCount || 0}</Tag>
          <Tag color="blue">
            Hash: {isAdmin ? (
              <a href={getTransactionLink(trade.hash, trade.chain)} target="_blank" rel="noopener noreferrer">{trade.hash}</a>
            ) : (
              trade.hash.slice(0, 10)
            )}
          </Tag>
          <Tag color="purple">Builder: {trade.builder}</Tag>
        </div>

        {/* 第二行 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Tag color="success">Gross: {Number(trade.gross).toFixed(4)}</Tag>
          <Tag color="processing">Net: {Number(trade.income).toFixed(4)}</Tag>
          <Tag color="warning">Bribe: {Number(trade.bribe).toFixed(4)}</Tag>
          <Tag color="error">Ratio: {calculateRatio(Number(trade.ratio))}</Tag>
        </div>

        {/* 第三行：Tag - 访客不显示 */}
        {!isGuess && trade.tags && trade.tags.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {trade.tags.map((tag, index) => (
              <Tag key={index} color={getTagColor(tag)}>{tag}</Tag>
            ))}
          </div>
        )}

        {/* extraInfo Tooltip - 仅管理员可见 */}
        {isAdmin && trade.extraInfo && (
          <div style={{ fontSize: 12, color: '#888' }}>
            <Tooltip
              title={<div style={{ whiteSpace: 'pre-wrap', maxWidth: 800, maxHeight: 400, overflow: 'auto' }}>{trade.extraInfo}</div>}
              placement="topLeft"
              overlayStyle={{ maxWidth: 800, maxHeight: 400 }}
              mouseEnterDelay={0.1}
            >
              <span style={{ cursor: 'pointer' }}>{trade.extraInfo.length > 50 ? `${trade.extraInfo.slice(0, 50)}...` : trade.extraInfo}</span>
            </Tooltip>
          </div>
        )}
      </div>

      {/* 时间显示在右下角 */}
      <div style={{ 
        position: 'absolute',
        bottom: 0,
        right: 0,
        fontSize: '12px',
        color: '#888',
        padding: '0 16px 8px 0'
      }}>
        {dayjs(trade.created_at).format('YYYY-MM-DD HH:mm:ss')}
      </div>
    </div>
  );
};

const renderTradeCard = (trade: TradeInfo) => <TradeCard trade={trade} />;

// 交易列表组件
const TradeList: React.FC<{ data: TradeInfo[] }> = ({ data }): JSX.Element => {
  const listRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  
  useEffect(() => {
    const updateHeight = () => {
      if (listRef.current) {
        setHeight(listRef.current.clientHeight);
      }
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const reversedData = [...data].reverse();

  return (
    <div 
      ref={listRef}
      className={styles.tradeList}
      style={{ 
        height: '100%',
        overflow: 'hidden',
        padding: '0 16px',
        background: '#f5f5f5'
      }}
    >
      <List>
        <VirtualList
          data={reversedData}
          height={height}
          itemHeight={140}
          itemKey="id"
          style={{ paddingTop: 16, paddingBottom: 16 }}
        >
          {(trade: TradeInfo) => (
            <List.Item
              style={{
                padding: '12px 16px',
                background: '#fff',
                borderRadius: '8px',
                marginBottom: '12px',
                border: '1px solid #f0f0f0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                position: 'relative'
              }}
            >
              <TradeCard trade={trade} />
            </List.Item>
          )}
        </VirtualList>
      </List>
    </div>
  );
};

const TransactionList: React.FC = () => {
  const { user } = useAuth();
  const isGuess = user?.type === 'guess';
  const {
    displayTrades,
    sortField, setSortField,
    sortOrder, setSortOrder,
    keyword, setKeyword,
    tag, setTag,
    currentChain,
    isPaused,
    dateRange, setDateRange,
    topInfo,
    tagProfits,
    dayProfit,
    yesterdayProfit,
    monthProfit,
    lastWeekProfit,
    lastMonthProfit,
    warnings,
    handleChainChange,
    handleSearch,
    handlePause,
    handleResume,
    handleWarningDelete,
  } = useTransactionListPC();

  // 处理 RangePicker 变更
  const onDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    setDateRange(dates ?? [null, null]);
  };

  // 收益展示组件
  const renderProfitInline = (chain: string): JSX.Element => (
    <Card bodyStyle={{ padding: '12px 16px' }}>
      <Row gutter={[24, 8]}>
        <Col>
          <Space>
            <Text type="secondary">当日</Text>
            <Text strong style={{ color: '#1890ff' }}>{Number(dayProfit[chain]?.income ?? 0).toFixed(2)}$</Text>
          </Space>
        </Col>
        <Col>
          <Space>
            <Text type="secondary">昨日</Text>
            <Text strong style={{ color: '#52c41a' }}>{Number(yesterdayProfit[chain]?.income ?? 0).toFixed(2)}$</Text>
          </Space>
        </Col>
        <Col>
          <Space>
            <Text type="secondary">本月</Text>
            <Text strong style={{ color: '#722ed1' }}>{Number(monthProfit[chain]?.income ?? 0).toFixed(2)}$</Text>
          </Space>
        </Col>
        <Col>
          <Space>
            <Text type="secondary">比例</Text>
            <Text strong style={{ color: '#fa8c16' }}>
              {dayProfit[chain]?.ratio !== undefined ? (dayProfit[chain].ratio * 100).toFixed(2) : '0.00'}%
            </Text>
          </Space>
        </Col>
        <Col>
          <Space>
            <Text type="secondary">上周</Text>
            <Text strong style={{ color: '#eb2f96' }}>{Number(lastWeekProfit[chain]?.income ?? 0).toFixed(2)}$</Text>
          </Space>
        </Col>
        <Col>
          <Space>
            <Text type="secondary">上月</Text>
            <Text strong style={{ color: '#13c2c2' }}>{Number(lastMonthProfit[chain]?.income ?? 0).toFixed(2)}$</Text>
          </Space>
        </Col>
      </Row>
    </Card>
  );

  const getChainColor = (chain: string): string => {
    const colors: Record<string, string> = {
      bsc: 'green',
      eth: 'blue',
      taiko: 'purple',
      zksync: 'orange',
      base: 'cyan',
      arbitrum: 'red',
      optimism: 'volcano',
      polygon: 'geekblue',
      linea: 'lime',
      scroll: 'gold',
      mantle: 'magenta',
      blast: 'processing',
      zora: 'success',
      mode: 'warning',
      fraxtal: 'error',
      kroma: 'default',
    };
    return colors[chain.toLowerCase()] || 'default';
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const handleLogout = () => {
    // Implement the logout logic here
    console.log('Logging out');
  };

  return (
    <Layout style={{ height: '100vh', background: '#f7f8fa' }}>
      <Sider width={120} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <Menu
          mode="inline"
          selectedKeys={[currentChain]}
          onClick={({ key }) => handleChainChange(key)}
          style={{ height: '100%', borderRight: 0 }}
        >
          {CHAIN_LIST.map(chain => (
            <Menu.Item key={chain.toLowerCase()}>{chain}</Menu.Item>
          ))}
        </Menu>
      </Sider>
      <Layout>
        <Content style={{ padding: '16px', overflow: 'auto', display: 'flex' }}>
          <div style={{ flex: 1, marginRight: '16px' }}>
            <Space direction="vertical" size="middle" style={{ width: '100%', display: 'flex' }}>
              {/* 顶部统计区域 */}
              <Card>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {renderProfitInline(currentChain)}
                  <Row gutter={16} align="middle">
                    <Col flex="200px">
                      <Input
                        placeholder="关键字(哈希/Builder/备注)"
                        allowClear
                        value={keyword}
                        onChange={e => setKeyword(e.target.value)}
                      />
                    </Col>
                    <Col flex="160px">
                      <Input
                        placeholder="标签"
                        allowClear
                        value={tag}
                        onChange={e => setTag(e.target.value)}
                      />
                    </Col>
                    <Col flex="160px">
                      <Select
                        value={sortField}
                        onChange={setSortField}
                        style={{ width: '100%' }}
                      >
                        {SORT_FIELDS.map(f => (
                          <Option value={f.value} key={f.value}>{f.label}</Option>
                        ))}
                      </Select>
                    </Col>
                    <Col flex="100px">
                      <Select
                        value={sortOrder}
                        onChange={setSortOrder}
                        style={{ width: '100%' }}
                      >
                        <Option value="desc">降序</Option>
                        <Option value="asc">升序</Option>
                      </Select>
                    </Col>
                    <Col flex="220px">
                      <RangePicker
                        value={dateRange}
                        onChange={onDateRangeChange}
                        style={{ width: '100%' }}
                      />
                    </Col>
                    <Col flex="auto">
                      <Space>
                        <Button
                          type="primary"
                          onClick={handleSearch}
                        >
                          搜索
                        </Button>
                        <Button
                          type={isPaused ? 'primary' : 'default'}
                          onClick={isPaused ? handleResume : handlePause}
                        >
                          {isPaused ? '继续' : '暂停'}
                        </Button>
                      </Space>
                    </Col>
                  </Row>
                </Space>
              </Card>

              {/* 交易列表区域 */}
              <Card bodyStyle={{ padding: 0 }}>
                <List>
                  <VirtualList
                    data={displayTrades.slice().reverse()}
                    height={600}
                    itemHeight={140}
                    itemKey="id"
                  >
                    {(trade: TradeInfo) => (
                      <List.Item style={{ padding: '12px 16px' }}>
                        <TradeCard trade={trade} />
                      </List.Item>
                    )}
                  </VirtualList>
                </List>
              </Card>
            </Space>
          </div>

          {/* 右侧面板 */}
          <div style={{ width: '300px' }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* Top Pools */}
              <Card title="1小时池子统计" size="small" bodyStyle={{ height: '37vh', overflow: 'auto', padding: '8px' }}>
                <List
                  dataSource={Array.isArray(topInfo[currentChain]?.pools) ? topInfo[currentChain].pools : []}
                  renderItem={pool => (
                    <List.Item style={{ padding: '4px 0' }}>
                      <Space size={4}>
                        <a href={`https://bscscan.com/address/${pool.address || ''}`} target="_blank" rel="noopener noreferrer">
                          <Text>{pool.symbol || '-'}</Text>
                        </a>
                        <Tag color="blue">{pool.counter ?? '-'}</Tag>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>

              {/* Tag Profits */}
              <Card title="收益标签" size="small" bodyStyle={{ height: '37vh', overflow: 'auto', padding: '8px' }}>
                <List
                  dataSource={tagProfits}
                  renderItem={item => (
                    <List.Item style={{ padding: '4px 0' }}>
                      <Space size={4}>
                        <Text>{item.tag}</Text>
                        <Tag color="green">${Number(item.total_profit).toFixed(2)}</Tag>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            </Space>
          </div>

          {/* Warning Float */}
          <WarningFloat warnings={warnings} onWarningDelete={handleWarningDelete} />
        </Content>
      </Layout>
    </Layout>
  );
};

export default TransactionList; 