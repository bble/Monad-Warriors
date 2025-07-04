import '@/styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from '@/utils/web3Config';
import { useState, useEffect } from 'react';
import Web3Provider from '@/components/Web3Provider';
import ErrorBoundary from '@/components/ErrorBoundary';
import NetworkErrorHandler from '@/components/NetworkErrorHandler';
import { installErrorSuppression } from '@/utils/errorSuppression';

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }));

  // 安装错误抑制机制
  useEffect(() => {
    if (typeof window !== 'undefined') {
      installErrorSuppression();
    }
  }, []);

  return (
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <Web3Provider>
              <Component {...pageProps} />
              <NetworkErrorHandler />
            </Web3Provider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
}
