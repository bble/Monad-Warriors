import { getDefaultConfig } from '@rainbow-me/rainbowkit';
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

// RainbowKit配置
export const config = getDefaultConfig({
  appName: 'Monad Warriors',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID', // 需要从WalletConnect获取
  chains: [monadTestnet],
  ssr: false, // 禁用SSR以避免构建问题
});

// 合约地址 (部署后需要更新)
export const CONTRACT_ADDRESSES = {
  MWAR_TOKEN: process.env.NEXT_PUBLIC_MWAR_TOKEN_ADDRESS || '',
  HERO_NFT: process.env.NEXT_PUBLIC_HERO_NFT_ADDRESS || '',
  GAME_CORE: process.env.NEXT_PUBLIC_GAME_CORE_ADDRESS || '',
};

// 合约ABI (简化版本，实际使用时需要完整ABI)
export const MWAR_TOKEN_ABI = [
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "to", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "spender", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const HERO_NFT_ABI = [
  {
    "inputs": [{"name": "owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "to", "type": "address"},
      {"name": "rarity", "type": "uint8"},
      {"name": "class", "type": "uint8"},
      {"name": "tokenURI", "type": "string"}
    ],
    "name": "mintHero",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "tokenId", "type": "uint256"}],
    "name": "getHeroAttributes",
    "outputs": [
      {
        "components": [
          {"name": "strength", "type": "uint256"},
          {"name": "intelligence", "type": "uint256"},
          {"name": "agility", "type": "uint256"},
          {"name": "vitality", "type": "uint256"},
          {"name": "luck", "type": "uint256"},
          {"name": "level", "type": "uint256"},
          {"name": "experience", "type": "uint256"},
          {"name": "rarity", "type": "uint8"},
          {"name": "class", "type": "uint8"},
          {"name": "birthTime", "type": "uint256"}
        ],
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "tokenId", "type": "uint256"}],
    "name": "levelUpHero",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const GAME_CORE_ABI = [
  {
    "inputs": [
      {"name": "myHeroId", "type": "uint256"},
      {"name": "opponent", "type": "address"},
      {"name": "opponentHeroId", "type": "uint256"}
    ],
    "name": "startPvPBattle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "player", "type": "address"}],
    "name": "playerStats",
    "outputs": [
      {
        "components": [
          {"name": "totalBattles", "type": "uint256"},
          {"name": "wins", "type": "uint256"},
          {"name": "losses", "type": "uint256"},
          {"name": "draws", "type": "uint256"},
          {"name": "totalRewards", "type": "uint256"},
          {"name": "lastBattleTime", "type": "uint256"},
          {"name": "winStreak", "type": "uint256"},
          {"name": "maxWinStreak", "type": "uint256"}
        ],
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "player", "type": "address"}],
    "name": "getPlayerWinRate",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// 游戏常量
export const GAME_CONSTANTS = {
  RARITY: {
    COMMON: 0,
    RARE: 1,
    EPIC: 2,
    LEGENDARY: 3,
  },
  CLASS: {
    WARRIOR: 0,
    MAGE: 1,
    ARCHER: 2,
    ASSASSIN: 3,
    PRIEST: 4,
  },
  RARITY_NAMES: ['Common', 'Rare', 'Epic', 'Legendary'],
  CLASS_NAMES: ['Warrior', 'Mage', 'Archer', 'Assassin', 'Priest'],
  RARITY_COLORS: ['gray', 'blue', 'purple', 'yellow'],
  MINT_COSTS: {
    [0]: '100', // Common
    [1]: '300', // Rare
    [2]: '800', // Epic
    [3]: '2000', // Legendary
  },
};

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
