// 简化的钱包配置，减少外部依赖
import { createConfig, http } from 'wagmi';
import { monadTestnet } from './web3Config';
import { injected, walletConnect } from 'wagmi/connectors';

// 创建一个更简单的配置，避免WalletConnect的外部依赖问题
export const simpleConfig = createConfig({
  chains: [monadTestnet],
  connectors: [
    injected(), // MetaMask, Coinbase Wallet等注入式钱包
    // 只在有项目ID时才启用WalletConnect
    ...(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID && 
        process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID !== 'your_walletconnect_project_id_here'
      ? [walletConnect({
          projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
          metadata: {
            name: 'Monad Warriors',
            description: 'Epic NFT battles on Monad blockchain',
            url: 'https://monad-warriors.netlify.app',
            icons: ['https://monad-warriors.netlify.app/favicon.ico']
          }
        })]
      : []
    )
  ],
  transports: {
    [monadTestnet.id]: http('https://testnet-rpc.monad.xyz'),
  },
});

// 导出钱包连接器信息
export const walletInfo = {
  supportedWallets: [
    {
      name: 'MetaMask',
      icon: '🦊',
      description: 'Connect using MetaMask browser extension',
      connector: 'injected'
    },
    {
      name: 'Coinbase Wallet',
      icon: '🔵',
      description: 'Connect using Coinbase Wallet',
      connector: 'injected'
    },
    {
      name: 'WalletConnect',
      icon: '🔗',
      description: 'Connect using WalletConnect protocol',
      connector: 'walletConnect',
      available: !!(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID && 
                   process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID !== 'your_walletconnect_project_id_here')
    }
  ]
};

// 错误处理函数
export const handleWalletError = (error: any) => {
  console.warn('Wallet connection error:', error);
  
  if (error.message?.includes('walletconnect')) {
    return {
      type: 'walletconnect',
      message: 'WalletConnect service temporarily unavailable. Please try MetaMask or refresh the page.',
      suggestion: 'Use MetaMask browser extension for the best experience.'
    };
  }
  
  if (error.message?.includes('User rejected')) {
    return {
      type: 'user_rejected',
      message: 'Connection cancelled by user.',
      suggestion: 'Please approve the connection request to continue.'
    };
  }
  
  if (error.message?.includes('No provider')) {
    return {
      type: 'no_provider',
      message: 'No wallet detected.',
      suggestion: 'Please install MetaMask or another Web3 wallet.'
    };
  }
  
  return {
    type: 'unknown',
    message: error.message || 'Unknown wallet error',
    suggestion: 'Please try refreshing the page or using a different wallet.'
  };
};
