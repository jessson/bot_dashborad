import React, { useEffect, useState } from 'react';
import { Button, Card, Typography, Row, Col, Spin, Alert, theme } from 'antd';
import { io, Socket } from 'socket.io-client';
import { APP_TITLE } from '@/config';

const { Title, Text } = Typography;
const { useToken } = theme;

const chainColors: Record<string, string> = {
  bsc: '#F3BA2F',
  sol: '#9945FF',
  eth: '#627EEA',
  sui: '#19B6FF',
};

interface WelcomeInfo {
  chain: string;
  income: number;
  txCount: number;
}

interface WelcomePageProps {
  onLoginClick: () => void;
  isMobile?: boolean;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({ onLoginClick, isMobile = false }) => {
  const [chains, setChains] = useState<WelcomeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useToken();

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('/api/welcome')
      .then(res => res.json())
      .then(data => {
        setChains(data);
        setLoading(false);
      })
      .catch(e => {
        setError('获取链数据失败');
        setLoading(false);
      });

    // Socket.IO动态更新
    const isDev = process.env.NODE_ENV === 'development';
    const wsHost = isDev ? 'localhost:3000' : window.location.hostname;
    const protocol = isDev ? 'ws' : 'wss';
    const socket: Socket = io(`${protocol}://${wsHost}`, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
      query: {
        _t: Date.now()
      }
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    socket.on('welcomeUpdate', (info: WelcomeInfo) => {
      setChains(prev => {
        const idx = prev.findIndex(c => c.chain === info.chain);
        if (idx !== -1) {
          const arr = [...prev];
          arr[idx] = info;
          return arr;
        } else {
          return [...prev, info];
        }
      });
    });

    return () => { socket.close(); };
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: token.colorBgLayout,
      position: 'relative',
      padding: isMobile ? '16px' : '24px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isMobile ? '24px' : '48px',
        paddingTop: isMobile ? '16px' : '24px'
      }}>
        <Title level={isMobile ? 4 : 2} style={{ margin: 0, flex: 1, textAlign: 'center' }}>
          {APP_TITLE}
        </Title>
        <Button type="primary" ghost onClick={onLoginClick} style={{ minWidth: isMobile ? '60px' : '80px' }}>
          登录
        </Button>
      </div>

      <div style={{
        maxWidth: isMobile ? '100%' : '1200px',
        margin: '0 auto',
        padding: isMobile ? '0' : '0 24px'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : error ? (
          <Alert message={error} type="error" showIcon />
        ) : (
          <Row gutter={[16, 16]}>
            {chains.map(chain => (
              <Col key={chain.chain} xs={24} sm={12} md={8} lg={6}>
                <Card
                  style={{
                    height: '100%',
                    borderRadius: token.borderRadiusLG,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                  bodyStyle={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: isMobile ? '16px' : '24px'
                  }}
                >
                  <Title level={4} style={{ 
                    color: chainColors[chain.chain.toLowerCase()] || token.colorTextSecondary,
                    marginBottom: isMobile ? '12px' : '16px',
                    marginTop: 0
                  }}>
                    {chain.chain.toUpperCase()}
                  </Title>
                  
                  <Text type="secondary" style={{ fontSize: isMobile ? '14px' : '16px' }}>
                    收益
                  </Text>
                  <Title level={4} style={{ 
                    color: chainColors[chain.chain.toLowerCase()] || token.colorTextSecondary,
                    margin: isMobile ? '4px 0 12px' : '8px 0 16px'
                  }}>
                    {Number(chain.income).toFixed(2)}
                  </Title>
                  
                  <Text type="secondary" style={{ fontSize: isMobile ? '14px' : '16px' }}>
                    交易数量
                  </Text>
                  <Title level={4} style={{ 
                    color: chainColors[chain.chain.toLowerCase()] || token.colorTextSecondary,
                    margin: isMobile ? '4px 0 0' : '8px 0 0'
                  }}>
                    {chain.txCount}
                  </Title>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </div>
  );
}; 