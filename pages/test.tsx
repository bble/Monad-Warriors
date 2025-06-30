import { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import ClientOnly from '@/components/ClientOnly';

export default function TestPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-pattern">
      <div className="container mx-auto px-4 py-8">
        <div className="glass-panel p-8">
          <h1 className="text-3xl font-bold mb-6">🧪 Hydration Test Page</h1>
          
          <div className="space-y-6">
            {/* Static Content - Should never cause hydration issues */}
            <div className="glass-panel p-4">
              <h2 className="text-xl font-semibold mb-2">✅ Static Content</h2>
              <p>This content is the same on server and client.</p>
            </div>

            {/* Dynamic Content - Wrapped in ClientOnly */}
            <div className="glass-panel p-4">
              <h2 className="text-xl font-semibold mb-2">🔄 Dynamic Content (Safe)</h2>
              <ClientOnly fallback={<p>Loading dynamic content...</p>}>
                <div className="space-y-2">
                  <p>Mounted: {mounted ? 'Yes' : 'No'}</p>
                  <p>Current Time: {new Date().toLocaleTimeString()}</p>
                  <p>Random Number: {Math.random().toFixed(4)}</p>
                </div>
              </ClientOnly>
            </div>

            {/* Web3 Content - Wrapped in ClientOnly */}
            <div className="glass-panel p-4">
              <h2 className="text-xl font-semibold mb-2">🔗 Web3 Content (Safe)</h2>
              <ClientOnly fallback={
                <div className="space-y-2">
                  <p>Wallet: Loading...</p>
                  <p>Chain ID: Loading...</p>
                  <div className="bg-gray-700 h-10 rounded animate-pulse"></div>
                </div>
              }>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p>Wallet Connected: {isConnected ? '✅ Yes' : '❌ No'}</p>
                    <p>Address: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}</p>
                    <p>Chain ID: {chainId || 'Unknown'}</p>
                  </div>
                  <ConnectButton />
                </div>
              </ClientOnly>
            </div>

            {/* Test Results */}
            <div className="glass-panel p-4">
              <h2 className="text-xl font-semibold mb-2">📊 Test Results</h2>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-green-400">✅</span>
                  <span>No hydration errors expected</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-400">✅</span>
                  <span>Dynamic content properly wrapped</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-400">✅</span>
                  <span>Web3 components safely rendered</span>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="glass-panel p-4">
              <h2 className="text-xl font-semibold mb-2">🧭 Navigation</h2>
              <div className="space-x-4">
                <a href="/" className="btn-primary">
                  Back to Game
                </a>
                <button 
                  onClick={() => window.location.reload()} 
                  className="btn-secondary"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
