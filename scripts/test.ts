import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

// 生成随机字符串
const randomString = (length: number) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// 生成随机哈希
const randomHash = () => '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

// 生成随机数字
const randomNumber = (min: number, max: number) => Math.random() * (max - min) + min;

// 生成随机标签
const randomTags = () => {
  const tags = ['Backrun', 'Block', 'HotPath', 'DODO', 'Panv4', 'Univ4', 'Algebra'];
  const count = Math.floor(Math.random() * 3) + 1;
  return Array.from({ length: count }, () => tags[Math.floor(Math.random() * tags.length)]);
};

// 生成随机链
const randomChain = () => {
  const chains = ['bsc', 'sol', 'eth', 'sui'];
  return chains[Math.floor(Math.random() * chains.length)];
};

// 生成随机池子
const randomPool = () => {
  const pools = [{
    symbol: 'USDT-BNB',
    address: '0x0000000000000000000000000000000000000000',
    counter: Math.floor(randomNumber(1, 100)),
  }, {
    symbol: 'ETH-USDT',
    address: '0x0000000000000000000000000000000000000000',
    counter: Math.floor(randomNumber(1, 100)),
  }, {
    symbol: 'BTC-ETH',
    address: '0x0000000000000000000000000000000000000000',
    counter: Math.floor(randomNumber(1, 100)),
  },
  {
    symbol: 'ETH-USDT',
    address: '0x0000000000000000000000000000000000000000',
    counter: Math.floor(randomNumber(1, 100)),
  },
  {
    symbol: 'ETH-BTCB',
    address: '0x0000000000000000000000000000000000000000',
    counter: Math.floor(randomNumber(1, 100)),
  },{
    symbol: 'USDT-BNB',
    address: '0x0000000000000000000000000000000000000000',
    counter: Math.floor(randomNumber(1, 100)),
  }, {
    symbol: 'ETH-USDT',
    address: '0x0000000000000000000000000000000000000000',
    counter: Math.floor(randomNumber(1, 100)),
  }, {
    symbol: 'BTC-ETH',
    address: '0x0000000000000000000000000000000000000000',
    counter: Math.floor(randomNumber(1, 100)),
  },
  {
    symbol: 'ETH-USDT',
    address: '0x0000000000000000000000000000000000000000',
    counter: Math.floor(randomNumber(1, 100)),
  },
  {
    symbol: 'ETH-BTCB',
    address: '0x0000000000000000000000000000000000000000',
    counter: Math.floor(randomNumber(1, 100)),
  },
];
  return pools;
};

// 发送交易数据
const sendTrade = async () => {
  const chain = 'bsc'; // 只推送bsc
  const extraInfo = randomString(1000);

  const data = {
    chain,
    builder: randomString(8),
    hash: randomHash(),
    vicHashes: [randomHash(), randomHash()],
    gross: randomNumber(1, 100),
    bribe: randomNumber(0.1, 10),
    income: randomNumber(1, 50),
    ratio: randomNumber(1, 100),
    extraInfo,
    txCount: 0,
    tags: randomTags(),
  };
  try {
    await axios.post(`${BASE_URL}/api/trade`, data);
    console.log('发送交易数据', data.hash);
  } catch (error) {
    console.error('发送交易数据失败:', error);
  }
};

// 发送预警数据
const sendWarning = async () => {
  const data = {
    chain: randomChain(),
    type: ['价格异常', '交易量异常', 'Gas异常'][Math.floor(Math.random() * 3)],
    msg: `测试预警信息 ${randomString(2000)}`,
  };
  try {
    await axios.post(`${BASE_URL}/api/warning`, data);
    console.log('发送预警数据:');
  } catch (error) {
    console.error('发送预警数据失败:', error);
  }
};

// 发送热门池子数据
const sendTopInfo = async () => {
  const data = {
    chain: randomChain(),
    pools: randomPool(),
  };
  try {
    await axios.post(`${BASE_URL}/api/top`, data);
    console.log('发送热门池子数据');
  } catch (error) {
    console.error('发送热门池子数据失败:', error);
  }
};

// 主函数
const main = async () => {
  // 自动登录 paipai/123456
  try {
    const res = await axios.post(`${BASE_URL}/api/login`, { username: 'paipai', password: 'ppsxxnv112.' });
    if (res.data && res.data.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      console.log('自动登录成功，token:', res.data.token);
    } else {
      console.error('自动登录失败，未获取到token:', res.data);
      return;
    }
  } catch (e) {
    console.error('自动登录失败:', e);
    return;
  }
  // 每5秒发送一次数据
  setInterval(async () => {
    await sendTrade();
    await sendWarning();
    await sendTopInfo();
    console.log('-------------------');
  }, 1000);
};

// 运行测试
main().catch(console.error);