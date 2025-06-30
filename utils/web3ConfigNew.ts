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
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' },
  },
  testnet: true,
});

// RainbowKit配置
export const config = getDefaultConfig({
  appName: 'Monad Warriors',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [monadTestnet],
  ssr: false,
});

// 合约地址 - 已部署的真实地址
export const CONTRACT_ADDRESSES = {
  MWAR_TOKEN: process.env.NEXT_PUBLIC_MWAR_TOKEN_ADDRESS || '0xD2f5d0418577BBCC98aAc97807e433dd091C1Be8',
  HERO_NFT: process.env.NEXT_PUBLIC_HERO_NFT_ADDRESS || '0xcD7Cd65d4bE940280B752e10C3eEb6D6cF53B18D',
  GAME_CORE: process.env.NEXT_PUBLIC_GAME_CORE_ADDRESS || '0xecde73957F1c15cE2E225fA4F485ABE03fcC7E48',
} as const;

// 验证合约地址
export const validateContractAddresses = () => {
  const addresses = Object.entries(CONTRACT_ADDRESSES);
  const invalidAddresses = addresses.filter(([key, address]) => !address || address.length !== 42);
  
  if (invalidAddresses.length > 0) {
    console.warn(`⚠️ Invalid contract addresses: ${invalidAddresses.map(([key]) => key).join(', ')}`);
    return false;
  }
  return true;
};

// 基础ABI - 最常用的函数（完整ABI将从contractABI.ts导入）
export const MWAR_TOKEN_ABI = [
  // ERC20 基础函数
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
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  // 游戏特定函数
  {
    "inputs": [
      {"name": "to", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "name": "mintReward",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "gameContract", "type": "address"}],
    "name": "gameContracts",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const HERO_NFT_ABI = [
  // ERC721 基础函数
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
  },
  {
    "inputs": [{"name": "rarity", "type": "uint8"}],
    "name": "mintCosts",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const GAME_CORE_ABI = [
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
  },
  {
    "inputs": [
      {"name": "heroId", "type": "uint256"},
      {"name": "opponent", "type": "address"},
      {"name": "opponentHeroId", "type": "uint256"}
    ],
    "name": "startPvPBattle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "baseWinReward",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DAILY_REWARD_LIMIT",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "BATTLE_COOLDOWN",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

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

// 工具函数
export const formatMWAR = (amount: bigint | string | number): string => {
  if (typeof amount === 'bigint') {
    return parseFloat(formatEther(amount)).toFixed(2);
  }
  return parseFloat(amount.toString()).toFixed(2);
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
  const icons = ['⚔️', '🔮', '🏹', '🗡️', '✨']; // Warrior, Mage, Archer, Assassin, Priest
  return icons[classType] || '⚔️';
};

// 导入formatEther函数
function formatEther(value: bigint): string {
  return (Number(value) / 1e18).toString();
}
