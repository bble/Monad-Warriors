import { createConfig, http } from 'wagmi';
import { defineChain } from 'viem';

// 定义Monad Testnet链
export const monadTestnet = defineChain({
  id: 41454,
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

// 简化的Wagmi配置（不使用RainbowKit）
export const config = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(),
  },
});

// 合约地址
export const CONTRACT_ADDRESSES = {
  MWAR_TOKEN: process.env.NEXT_PUBLIC_MWAR_TOKEN_ADDRESS || '',
  HERO_NFT: process.env.NEXT_PUBLIC_HERO_NFT_ADDRESS || '',
  GAME_CORE: process.env.NEXT_PUBLIC_GAME_CORE_ADDRESS || '',
};

// 游戏常量
export const GAME_CONSTANTS = {
  RARITY_NAMES: ['Common', 'Rare', 'Epic', 'Legendary'],
  CLASS_NAMES: ['Warrior', 'Mage', 'Archer', 'Assassin', 'Priest'],
  MINT_COSTS: [100, 300, 800, 2000],
};

export const getRarityColor = (rarity: number): string => {
  const colors = [
    'text-gray-400',    // Common
    'text-blue-400',    // Rare  
    'text-purple-400',  // Epic
    'text-yellow-400'   // Legendary
  ];
  return colors[rarity] || 'text-gray-400';
};

export const getClassIcon = (classType: number): string => {
  const icons = ['⚔️', '🔮', '🏹', '🗡️', '✨'];
  return icons[classType] || '⚔️';
};

export const formatMWAR = (amount: bigint): string => {
  return (Number(amount) / 1e18).toFixed(2);
};
