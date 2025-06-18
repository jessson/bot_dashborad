# SimpleBot Dashboard

链收益监控平台前端项目。

## 开发环境

- Node.js >= 16
- npm >= 8

## 安装依赖

```bash
npm install
```

## 开发

```bash
# 启动前端开发服务器（端口 8000）
npm run dev

# 启动后端开发服务器
npm run server:dev
```

## 部署流程

### 1. 构建项目

```bash
# 构建前端
npm run build

# 构建后端
npm run server:build
```

### 2. 部署前端

将构建好的前端文件复制到你的自定义目录：

```bash
# 复制 dist 目录下的所有文件到你的自定义目录
sudo cp -r dist/* /path/to/your/dist/
```

### 3. 配置 Nginx

1. 创建 Nginx 配置文件：

```bash
# 创建配置文件目录（如果不存在）
sudo mkdir -p /etc/nginx/conf.d

# 创建配置文件
sudo nano /etc/nginx/conf.d/arb-bots.conf
```

2. 配置文件内容：

```nginx
server {
    listen 80;
    server_name your_domain.com;  # 替换为你的域名
    return 301 https://$host$request_uri;
}

server {
    ssl_certificate /etc/letsencrypt/live/your_domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your_domain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    listen 443 ssl;
    server_name your_domain.com;

    # 前端文件
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理
    location /api {
        proxy_pass http://localhost:7000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket 反向代理
    location /socket.io {
        proxy_pass http://localhost:7000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

3. 使用软链接管理配置文件：

```bash
# 创建配置文件的软链接
sudo ln -sf /etc/nginx/conf.d/arb-bots.conf /etc/nginx/sites-enabled/arb-bots.conf

# 如果需要，移除默认配置
sudo rm -f /etc/nginx/sites-enabled/default
```

### 4. 部署后端

1. 安装 PM2：
```bash
npm install -g pm2
```

2. 配置 PM2：
创建 `ecosystem.config.js` 文件：

```javascript
module.exports = {
  apps: [{
    name: 'arb-bots-server',
    script: './server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true
  }]
};
```

3. 使用 PM2 启动服务：
```bash
# 启动服务
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save
```

4. PM2 常用命令：
```bash
# 查看所有应用状态
pm2 status

# 查看特定应用日志
pm2 logs arb-bots-server

# 查看错误日志
pm2 logs arb-bots-server --err

# 重启应用
pm2 restart arb-bots-server

# 停止应用
pm2 stop arb-bots-server

# 删除应用
pm2 delete arb-bots-server

# 监控应用
pm2 monit

# 查看应用详细信息
pm2 show arb-bots-server

# 重新加载应用（零停机重启）
pm2 reload arb-bots-server

# 查看 PM2 日志
pm2 logs

# 清除所有日志
pm2 flush

# 清除特定应用的日志
pm2 flush arb-bots-server
```

### 5. 配置防火墙

```bash
# 设置默认策略
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 允许 SSH (22端口)
sudo ufw allow 22/tcp

# 允许 HTTPS (443端口)
sudo ufw allow 443/tcp

# 启用防火墙
sudo ufw enable

# 查看规则
sudo ufw status verbose
```

### 6. 重启 Nginx

```bash
# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

## 项目结构

```
.
├── config/             # UmiJS 配置
├── dist/              # 前端构建输出
├── scripts/           # 脚本文件
├── server/            # 后端代码
│   ├── entity/        # 数据实体
│   ├── tasks/         # 定时任务
│   └── utils/         # 工具函数
├── src/               # 前端源代码
│   ├── components/    # 组件
│   ├── contexts/      # 上下文
│   ├── layouts/       # 布局
│   ├── pages/         # 页面
│   ├── services/      # API 服务
│   ├── types/         # 类型定义
│   └── utils/         # 工具函数
├── .umirc.ts          # UmiJS 配置
├── package.json       # 项目配置
└── tsconfig.json      # TypeScript 配置
```

## 技术栈

- 前端：React + UmiJS + Ant Design
- 后端：Node.js + Express + TypeORM
- 数据库：SQLite
- 部署：Nginx + PM2

## 主要功能

1. 交易监控
   - 实时显示各链上的交易数据
   - 支持按链类型筛选（BSC、SOL、ETH、SUI）
   - 支持按收益、毛利、贿赂等字段排序
   - 支持关键词和标签搜索
   - 支持时间范围筛选

2. 收益统计
   - 显示当日、昨日、本周、上周、本月、上月的收益数据
   - 支持按链类型查看收益
   - 显示收益比例
   - 支持标签收益统计

3. 预警系统
   - 实时监控异常交易
   - 显示预警信息
   - 支持预警信息删除
   - 支持按链类型筛选预警

4. 池子统计
   - 显示 1 小时内热门池子
   - 支持按链类型查看池子
   - 显示池子交易次数

## 配置说明

在 `src/config.ts` 中可以修改以下配置：

```typescript
export const APP_TITLE = '小金库';  // 应用标题
export const CHAIN_LIST = ['BSC', 'SOL', 'ETH', 'SUI'];  // 支持的链类型
```

在 `.env` 文件中配置环境变量：

```env
# 服务器配置
PORT=7000

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=4h

# 跨域配置
CORS_ORIGIN=http://localhost:8000

# WebSocket配置
WS_PORT=7001

# 数据库配置
DB_TYPE=sqlite
DB_DATABASE=arb-bots.db
```

## 注意事项

1. 需要配置后端 API 地址
2. 需要配置 WebSocket 服务器地址
3. 需要配置认证信息
4. 需要配置数据库连接信息

# Arb Bots SDK

## API 结构及功能

### 认证相关
- `POST /api/login`
  - 功能：用户登录
  - 参数：
    - username: 用户名
    - password: 密码
  - 返回：token 和用户类型

### 交易相关
- `GET /api/history`
  - 功能：获取历史数据
  - 返回：
    - trades: 交易列表
    - warnings: 预警信息
    - profits: 收益统计
    - tops: Top 信息

- `GET /api/trade/search`
  - 功能：搜索交易记录
  - 参数：
    - chain: 链名称（可选）
    - keyword: 关键词（可选）
    - tag: 标签（可选）
    - sort: 排序字段（可选，默认 created_at）
    - order: 排序方向（可选，默认 desc）
    - limit: 限制返回数量（可选，默认 500）
    - start: 开始时间（可选）
    - end: 结束时间（可选）
  - 返回：符合条件的交易列表

### 预警相关
- `POST /api/warning`
  - 功能：添加预警信息
  - 参数：Warning 对象
    - type: 预警类型
    - msg: 预警消息
    - chain: 链名称

- `DELETE /api/warning/{id}`
  - 功能：删除预警信息
  - 参数：预警 ID

### Top 信息相关
- `POST /api/top`
  - 功能：更新 Top 信息
  - 参数：
    - chain: 链名称
    - pools: 池子列表

### 统计信息相关
- `GET /api/welcome`
  - 功能：获取欢迎页信息
  - 返回：各链的收入和交易数量统计

- `GET /api/tag/daily-profit`
  - 功能：获取标签收益统计
  - 返回：各标签的总收益

- `GET /api/profit`
  - 功能：获取收益统计信息
  - 返回：各链的收益统计
    - chain: 链名称
    - today: 今日收益
      - income: 实际收入
      - gross: 总收益
      - txCount: 交易数量
    - yesterday: 昨日收益
    - thisWeek: 本周收益
    - lastWeek: 上周收益
    - thisMonth: 本月收益
    - lastMonth: 上月收益

## 数据结构

### TradeInfo
```typescript
interface TradeInfo {
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
```

### PoolInfo
```typescript
interface PoolInfo {
    symbol: string;
    address: string;
    counter: number;
}
```

### TopInfo
```typescript
interface TopInfo {
    chain: string;
    pools: PoolInfo[];
    builders: { name: string; address: string; counter: number }[];
}
```

### ProfitInfo
```typescript
interface ProfitInfo {
    income: number;    // 实际收入
    gross: number;     // 总收益
    txCount: number;   // 交易数量
}
```

### ProfitEvent
```typescript
interface ProfitEvent {
    chain: string;     // 链名称
    today: ProfitInfo; // 今日收益
    yesterday: ProfitInfo; // 昨日收益
    thisWeek: ProfitInfo;  // 本周收益
    lastWeek: ProfitInfo;  // 上周收益
    thisMonth: ProfitInfo; // 本月收益
    lastMonth: ProfitInfo; // 上月收益
}
```

### TagProfitInfo
```typescript
interface TagProfitInfo {
    chain: string;
    tag: string;
    total_profit: number;
}
```

### WarningInfo
```typescript
interface WarningInfo {
    id: number;
    create_at: string;
    type: string;
    msg: string;
    chain: string;
    delete?: boolean;
}
```

### User
```typescript
interface User {
    username: string;
    type: 'normal' | 'admin' | 'guess';
}
```

## 免责声明

**重要提示：** 本仓库中的代码由 AI 自动生成，可能存在潜在的安全漏洞和风险。使用本代码时请注意：

1. 本代码仅供学习和研究使用，不构成任何投资建议
2. 使用本代码可能导致的任何财产损失、数据泄露、安全漏洞等问题，与仓库作者无关
3. 在使用本代码之前，请务必：
   - 仔细审查代码安全性
   - 在测试环境中充分测试
   - 了解相关风险
   - 自行承担使用风险

作者不对使用本代码导致的任何损失负责。 
