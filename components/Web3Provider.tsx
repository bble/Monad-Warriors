import { ReactNode, useEffect, useState } from 'react';

interface Web3ProviderProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function Web3Provider({ children, fallback }: Web3ProviderProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-pattern">
        <div className="container mx-auto px-4 py-8">
          <div className="glass-panel p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Loading Monad Warriors</h2>
            <p className="text-gray-400">Initializing Web3 connection...</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
