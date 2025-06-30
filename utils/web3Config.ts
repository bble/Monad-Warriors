import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';

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
    default: { name: 'Monad Explorer', url: 'https://testnet-explorer.monad.xyz' },
  },
  testnet: true,
});

// RainbowKit配置
export const config = getDefaultConfig({
  appName: 'Monad Warriors',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID', // 需要从WalletConnect获取
  chains: [monadTestnet],
  ssr: false, // 禁用SSR以避免构建问题
});

// 合约地址 - 已部署的真实地址
export const CONTRACT_ADDRESSES = {
  MWAR_TOKEN: process.env.NEXT_PUBLIC_MWAR_TOKEN_ADDRESS || '0xD2f5d0418577BBCC98aAc97807e433dd091C1Be8',
  HERO_NFT: process.env.NEXT_PUBLIC_HERO_NFT_ADDRESS || '0xcD7Cd65d4bE940280B752e10C3eEb6D6cF53B18D',
  GAME_CORE: process.env.NEXT_PUBLIC_GAME_CORE_ADDRESS || '0xecde73957F1c15cE2E225fA4F485ABE03fcC7E48',
} as const;

// 工具函数
export const formatMWAR = (amount: bigint): string => {
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
  MINT_COSTS: {
    0: 100,   // Common
    1: 300,   // Rare
    2: 800,   // Epic
    3: 2000   // Legendary
  },
  LEVEL_UP_BASE_COST: 100,
  MAX_LEVEL: 100,
} as const;
