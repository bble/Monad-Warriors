# 🚀 Monad Warriors 部署指南

## 📋 环境变量配置

### Netlify 部署配置

在 Netlify 控制台中设置以下环境变量：

#### 🔑 必需的环境变量

```bash
# 区块链配置
NEXT_PUBLIC_MONAD_TESTNET_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_CHAIN_ID=10143

# 智能合约地址 (部署后更新)
NEXT_PUBLIC_GAME_CORE_ADDRESS=0x935e44C9fAc29E17AcE3E5AB047D8027E6E1A101
NEXT_PUBLIC_HERO_NFT_ADDRESS=0x1234567890123456789012345678901234567890
NEXT_PUBLIC_MWAR_TOKEN_ADDRESS=0x1234567890123456789012345678901234567890

# 水龙头配置 (可选 - 用于真实代币分发)
PRIVATE_KEY=your_private_key_here
MONAD_TESTNET_RPC_URL=https://testnet-rpc.monad.xyz

# WalletConnect配置 (可选)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here
```

#### 🎮 功能说明

1. **水龙头功能**
   - 如果配置了 `PRIVATE_KEY`：真实代币分发
   - 如果未配置：返回配置错误信息
   - 建议：生产环境配置专用的水龙头钱包私钥

2. **Multisync功能**
   - Netlify环境：自动使用HTTP API (/.netlify/functions/game-sync)
   - 本地开发：使用WebSocket服务器 (ws://localhost:8080)
   - 无需额外配置，自动检测环境

3. **钱包连接**
   - 支持MetaMask、Coinbase Wallet等注入式钱包
   - WalletConnect为可选功能

## 🛠️ 本地开发

### 启动完整开发环境

```bash
# 安装依赖
npm install

# 启动前端 + WebSocket服务器
npm run dev:full

# 或者分别启动
npm run dev          # 仅前端 (localhost:3001)
npm run websocket    # 仅WebSocket服务器 (localhost:8080)
```

### 环境变量设置

1. 复制环境变量模板：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入实际值

## 🔧 故障排除

### 水龙头无法工作
- 检查 `PRIVATE_KEY` 环境变量是否正确设置
- 确认钱包有足够的测试币
- 检查智能合约地址是否正确

### Multisync连接失败
- Netlify环境：检查 `/.netlify/functions/game-sync` 是否可访问
- 本地环境：确认WebSocket服务器在端口8080运行
- 检查浏览器控制台是否有网络错误

### 钱包连接问题
- 确认MetaMask已安装并连接到Monad测试网
- 检查网络配置：Chain ID 10143
- 清除浏览器缓存和MetaMask缓存

## 📊 监控和日志

- 前端错误：浏览器开发者工具控制台
- API错误：Netlify Functions日志
- 网络错误：右下角错误监控组件

## 🎯 生产环境检查清单

- [ ] 所有环境变量已正确配置
- [ ] 智能合约已部署并验证
- [ ] 水龙头钱包有足够余额
- [ ] 测试所有核心功能
- [ ] 检查跨设备同步功能
- [ ] 验证错误处理机制

## 🔗 相关链接

- [Monad Testnet Explorer](https://testnet.monadexplorer.com)
- [Monad Testnet RPC](https://testnet-rpc.monad.xyz)
- [项目GitHub](https://github.com/bble/Monad-Warriors)
- [Netlify部署](https://monad-warriors.netlify.app)
