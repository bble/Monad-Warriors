import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';
import { http } from 'wagmi';

// 定义Monad Testnet链
export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC_URL || 'https://testnet-rpc.monad.xyz'],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC_URL || 'https://testnet-rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' },
  },
  testnet: true,
});

// RainbowKit配置 - 使用最小配置避免外部依赖错误
export const config = getDefaultConfig({
  appName: 'Monad Warriors',
  projectId: '00000000000000000000000000000000', // 使用空项目ID避免403错误
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http('https://testnet-rpc.monad.xyz'),
  },
  ssr: false, // 禁用SSR以避免构建问题
});

// Gas优化配置 - 节省测试币的gas设置
export const GAS_CONFIG = {
  // 推荐的gas价格 (15 gwei for Monad testnet)
  gasPrice: '15000000000',
  maxFeePerGas: '15000000000',
  maxPriorityFeePerGas: '1000000000',
  // 不同操作的gas限制
  gasLimits: {
    transfer: 21000,
    approve: 100000,
    mintHero: 500000,
    levelUp: 200000,
    battle: 300000,
  },
} as const;

// 合约地址 - 已部署的真实地址
export const CONTRACT_ADDRESSES = {
  MWAR_TOKEN: process.env.NEXT_PUBLIC_MWAR_TOKEN_ADDRESS || '0xa200561a8e6325fD24AE767c1701F2d1Aa3860e1',
  HERO_NFT: process.env.NEXT_PUBLIC_HERO_NFT_ADDRESS || '0x01Eb7582f8cf98EeB5bd7F0aCfC8DACCeeD18F96',
  GAME_CORE: process.env.NEXT_PUBLIC_GAME_CORE_ADDRESS || '0x935e44C9fAc29E17AcE3E5AB047D8027E6E1A101',
} as const;

// 工具函数
export const formatMWAR = (amount: bigint | undefined | null): string => {
  if (!amount) return '0.00';
  return (Number(amount) / 1e18).toFixed(2);
};

export const parseMWAR = (amount: string): bigint => {
  return BigInt(Math.floor(parseFloat(amount) * 1e18));
};

export const getRarityColor = (rarity: number): string => {
  const colors = ['text-gray-400', 'text-blue-400', 'text-purple-400', 'text-yellow-400'];
  return colors[rarity] || colors[0];
};

export const getClassIcon = (classType: number): string => {
  const icons = ['⚔️', '🔮', '🏹', '🗡️', '✨'];
  return icons[classType] || icons[0];
};

// 游戏常量
export const GAME_CONSTANTS = {
  RARITY_NAMES: ['Common', 'Rare', 'Epic', 'Legendary'],
  CLASS_NAMES: ['Warrior', 'Mage', 'Archer', 'Assassin', 'Priest'],
  RARITY_COLORS: ['gray', 'blue', 'purple', 'yellow'], // 用于动态构建CSS类名
  MINT_COSTS: {
    0: 100,   // Common
    1: 300,   // Rare
    2: 800,   // Epic
    3: 2000   // Legendary
  },
  LEVEL_UP_BASE_COST: 100,
  MAX_LEVEL: 100,
} as const;
