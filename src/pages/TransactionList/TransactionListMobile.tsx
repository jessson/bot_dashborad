import React, { useState } from 'react';
import { Layout, Menu, Input, Select, Button, Drawer, Modal, Row, Col, Card, List, Typography, Space, Tag, Badge } from 'antd';
import { useAuth } from '../../contexts/AuthContext';
import { CHAIN_LIST } from '../../config';
import { SORT_FIELDS, useTransactionListPC } from './useTransactionListPC';
import type { TradeInfo } from './useTransactionListPC';
import dayjs from 'dayjs';
import VirtualList from 'rc-virtual-list';

const { Text } = Typography;
const { Option } = Select;
const { Header, Content } = Layout;

// Tag 颜色函数
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

const TransactionListMobile: React.FC = () => {
  const { user, logout } = useAuth();
  const isAdmin = user?.type === 'admin';
  const isGuess = user?.type === 'guess';

  const {
    displayTrades,
    sortField, setSortField,
    sortOrder, setSortOrder,
    keyword, setKeyword,
    tag, setTag,
    currentChain,
    isPaused,
    topInfo,
    tagProfits,
    dayProfit,
    yesterdayProfit,
    handleChainChange,
    handleSearch,
    handlePause,
    handleResume,
  } = useTransactionListPC();

  const [mobileChainOpen, setMobileChainOpen] = useState(false);
  const [mobileTopOpen, setMobileTopOpen] = useState(false);
  const [mobileTagOpen, setMobileTagOpen] = useState(false);
  const [extraInfoModal, setExtraInfoModal] = useState({ open: false, content: '' });

  // 收益展示组件
  const renderProfitInline = (chain: string) => (
    <Card size="small" bodyStyle={{ padding: '8px' }}>
      <Row gutter={[8, 4]}>
        <Col span={8}>
          <Space direction="vertical" size={0}>
            <Text type="secondary" style={{ fontSize: '11px' }}>昨日</Text>
            <Text strong style={{ color: '#52c41a', fontSize: '13px' }}>{Number(yesterdayProfit[chain]?.income ?? 0).toFixed(2)}$</Text>
          </Space>
        </Col>
        <Col span={8}>
          <Space direction="vertical" size={0}>
            <Text type="secondary" style={{ fontSize: '11px' }}>当日</Text>
              <Text strong style={{ color: '#1890ff', fontSize: '13px' }}>{Number(dayProfit[chain]?.income ?? 0).toFixed(2)}$</Text>
          </Space>
        </Col>
        <Col span={8}>
          <Space direction="vertical" size={0}>
            <Text type="secondary" style={{ fontSize: '11px' }}>比例</Text>
            <Text strong style={{ color: '#fa8c16', fontSize: '13px' }}>
              {dayProfit[chain]?.ratio !== undefined ? (dayProfit[chain].ratio * 100).toFixed(2) : '0.00'}%
            </Text>
          </Space>
        </Col>
      </Row>
    </Card>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: '#f7f8fa' }}>
      <div style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: '#fff'
      }}>
        <Header style={{ 
          padding: '8px 12px', 
          height: 'auto', 
          background: '#fff', 
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
        }}>
          <Row gutter={[8, 8]} align="middle">
            <Col>
              <Button onClick={() => setMobileChainOpen(true)} size="middle">
                {currentChain.toUpperCase()}
              </Button>
            </Col>
            <Col flex="auto">
              <Space>
                <Button size="middle" onClick={() => setMobileTopOpen(true)}>池子</Button>
                <Button size="middle" onClick={() => setMobileTagOpen(true)}>标签</Button>
                <Button size="middle" danger onClick={logout}>退出</Button>
              </Space>
            </Col>
          </Row>
        </Header>

        <div style={{ 
          background: '#f7f8fa',
          padding: '8px',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <Space direction="vertical" size={8} style={{ width: '100%', display: 'flex' }}>
            {renderProfitInline(currentChain)}

            <Card size="small" bodyStyle={{ padding: '8px' }}>
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <Row gutter={8}>
                  <Col span={12}>
                    <Input
                      placeholder="关键字"
                      allowClear
                      value={keyword}
                      onChange={e => setKeyword(e.target.value)}
                      size="middle"
                    />
                  </Col>
                  <Col span={12}>
                    <Input
                      placeholder="标签"
                      allowClear
                      value={tag}
                      onChange={e => setTag(e.target.value)}
                      size="middle"
                    />
                  </Col>
                </Row>

                <Row gutter={8}>
                  <Col span={12}>
                    <Select
                      value={sortField}
                      onChange={setSortField}
                      style={{ width: '100%' }}
                      size="middle"
                    >
                      {SORT_FIELDS.map(f => (
                        <Option value={f.value} key={f.value}>{f.label}</Option>
                      ))}
                    </Select>
                  </Col>
                  <Col span={12}>
                    <Select
                      value={sortOrder}
                      onChange={setSortOrder}
                      style={{ width: '100%' }}
                      size="middle"
                    >
                      <Option value="desc">降序</Option>
                      <Option value="asc">升序</Option>
                    </Select>
                  </Col>
                </Row>

                <Row gutter={8}>
                  <Col span={12}>
                    <Button
                      type={isPaused ? 'primary' : 'default'}
                      onClick={isPaused ? handleResume : handlePause}
                      block
                      size="middle"
                    >
                      {isPaused ? '继续' : '暂停'}
                    </Button>
                  </Col>
                  <Col span={12}>
                    <Button
                      type="primary"
                      onClick={handleSearch}
                      block
                      size="middle"
                    >
                      搜索
                    </Button>
                  </Col>
                </Row>
              </Space>
            </Card>
          </Space>
        </div>
      </div>

      {/* 交易列表区域 */}
      <div className="tradeListArea" style={{ 
        marginTop: '280px',
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        background: '#f5f5f5',
        padding: '8px'
      }}>
        <List>
          {displayTrades.slice().reverse().map((trade, idx) => (
            <List.Item
              key={trade.id || idx}
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
              <div style={{ position: 'relative', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '24px' }}>
                  {/* 第一行 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <Tag color="orange">TxCount: {trade.txCount}</Tag>
                    {isGuess ? (
                      <Tag color="blue">{trade.hash.slice(0, 10)}...</Tag>
                    ) : isAdmin ? (
                      <a href={`https://bscscan.com/tx/${trade.hash}`} target="_blank" rel="noopener noreferrer">
                        <Tag color="blue">{trade.hash.slice(0, 10)}...</Tag>
                      </a>
                    ) : (
                      <Tag color="blue">{trade.hash.slice(0, 10)}...</Tag>
                    )}
                    <Tag color="purple">
                      Builder: {trade.builder.length > 10 ? `${trade.builder.slice(0, 5)}...` : trade.builder}
                    </Tag>
                  </div>

                  {/* 第二行 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <Tag color="success">Gross: {Number(trade.gross).toFixed(4)}</Tag>
                    <Tag color="processing">Net: {Number(trade.income).toFixed(4)}</Tag>
                    <Tag color="warning">Bribe: {Number(trade.bribe).toFixed(4)}</Tag>
                    <Tag color="error">Ratio: {Number(trade.ratio).toFixed(2)}%</Tag>
                  </div>

                  {/* 第三行：Tag - 访客不显示 */}
                  {!isGuess && trade.tags && trade.tags.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {trade.tags.map((tag, index) => (
                        <Tag key={index} color={getTagColor(tag)}>{tag}</Tag>
                      ))}
                    </div>
                  )}

                  {/* extraInfo - 仅管理员可见 */}
                  {isAdmin && trade.extraInfo && (
                    <div style={{ fontSize: 12, color: '#888' }}>
                      <span 
                        style={{ cursor: 'pointer' }}
                        onClick={() => setExtraInfoModal({ open: true, content: trade.extraInfo })}
                      >
                        {trade.extraInfo.length > 50 ? `${trade.extraInfo.slice(0, 50)}...` : trade.extraInfo}
                      </span>
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
            </List.Item>
          ))}
        </List>
      </div>

      {/* 抽屉和弹窗 */}
      <Drawer
        title="选择链"
        placement="left"
        open={mobileChainOpen}
        onClose={() => setMobileChainOpen(false)}
        width={140}
      >
        <Menu
          selectedKeys={[currentChain]}
          onClick={({ key }) => { handleChainChange(key); setMobileChainOpen(false); }}
        >
          {CHAIN_LIST.map(chain => (
            <Menu.Item key={chain.toLowerCase()}>{chain}</Menu.Item>
          ))}
        </Menu>
      </Drawer>

      <Drawer
        title="1小时池子统计"
        placement="right"
        open={mobileTopOpen}
        onClose={() => setMobileTopOpen(false)}
        width={280}
      >
        <List
          dataSource={Array.isArray(topInfo[currentChain]?.pools) ? topInfo[currentChain].pools : []}
          renderItem={pool => (
            <List.Item>
              <Space>
                <a href={`https://bscscan.com/address/${pool.address || ''}`} target="_blank" rel="noopener noreferrer">
                  <Text>{pool.symbol || '-'}</Text>
                </a>
                <Tag color="blue">{pool.counter ?? '-'}</Tag>
              </Space>
            </List.Item>
          )}
        />
      </Drawer>

      <Drawer
        title="收益标签"
        placement="right"
        open={mobileTagOpen}
        onClose={() => setMobileTagOpen(false)}
        width={280}
      >
        <List
          dataSource={tagProfits}
          renderItem={item => (
            <List.Item>
              <Space>
                <Text>{item.tag}</Text>
                <Tag color="green">${item.total_profit}</Tag>
              </Space>
            </List.Item>
          )}
        />
      </Drawer>

      <Modal
        title="详细信息"
        open={extraInfoModal.open}
        onCancel={() => setExtraInfoModal({ open: false, content: '' })}
        footer={null}
      >
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {extraInfoModal.content}
        </pre>
      </Modal>
    </Layout>
  );
};

export default TransactionListMobile; 