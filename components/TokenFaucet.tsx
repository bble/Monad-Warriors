import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import ClientOnly from './ClientOnly';

export default function TokenFaucet() {
  const { address, isConnected } = useAccount();
  const [faucetStatus, setFaucetStatus] = useState<{
    canClaim: boolean;
    timeUntilNext: number;
    amount: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // 获取水龙头状态
  useEffect(() => {
    const fetchFaucetStatus = async () => {
      if (!address) return;

      try {
        const response = await fetch('/api/faucet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, action: 'status' })
        });

        if (response.ok) {
          const status = await response.json();
          setFaucetStatus(status);
        }
      } catch (error) {
        // 静默处理错误
      }
    };

    fetchFaucetStatus();
    // 每30秒更新一次状态
    const interval = setInterval(fetchFaucetStatus, 30000);
    return () => clearInterval(interval);
  }, [address]);

  // 格式化剩余时间
  const formatTimeLeft = (seconds: number) => {
    if (seconds <= 0) return null;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const handleClaimTokens = async () => {
    if (!address || !faucetStatus?.canClaim) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, action: 'claim' })
      });

      const result = await response.json();

      if (response.ok) {
        setLastTxHash(result.txHash);
        setMessage(`🎉 Successfully claimed ${result.amount} MWAR tokens!`);
        // 更新状态
        setFaucetStatus(prev => prev ? { ...prev, canClaim: false, timeUntilNext: 24 * 60 * 60 } : null);
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error) {
      setMessage('❌ Failed to claim tokens. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="glass-panel p-6">
        <h3 className="text-xl font-semibold mb-4">🚰 MWAR Token Faucet</h3>
        <p className="text-gray-400 mb-4">
          Connect your wallet to claim free MWAR tokens.
        </p>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🔗</div>
          <p className="text-gray-500">Wallet not connected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6">
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.includes('🎉') ? 'bg-green-900/20 border border-green-500/30 text-green-400' :
          'bg-red-900/20 border border-red-500/30 text-red-400'
        }`}>
          {message}
          {lastTxHash && (
            <div className="mt-2 text-xs">
              <a
                href={`https://testnet.monadexplorer.com/tx/${lastTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                View Transaction ↗
              </a>
            </div>
          )}
        </div>
      )}

      <h3 className="text-xl font-semibold mb-4">🚰 MWAR Token Faucet</h3>
      
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-4 rounded-lg mb-6">
        <div className="flex items-center space-x-3 mb-3">
          <span className="text-3xl">💧</span>
          <div>
            <h4 className="font-semibold">Free MWAR Tokens</h4>
            <p className="text-sm text-gray-400">Get 1000 MWAR tokens every 24 hours</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Amount:</span>
            <div className="text-yellow-400 font-semibold">
              {faucetStatus?.amount || '1000'} MWAR
            </div>
          </div>
          <div>
            <span className="text-gray-400">Cooldown:</span>
            <div className="text-blue-400 font-semibold">24 hours</div>
          </div>
        </div>
      </div>

      {faucetStatus && !faucetStatus.canClaim && (
        <div className="bg-orange-900/20 border border-orange-500/30 p-4 rounded-lg mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-orange-400">⏰</span>
            <div>
              <div className="font-semibold text-orange-400">Cooldown Active</div>
              <div className="text-sm text-orange-300">
                Next claim available in: {formatTimeLeft(faucetStatus.timeUntilNext) || 'Soon'}
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleClaimTokens}
        disabled={isLoading || !faucetStatus?.canClaim}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="loading-spinner"></div>
            <span>Claiming...</span>
          </div>
        ) : !faucetStatus ? (
          'Loading...'
        ) : !faucetStatus.canClaim ? (
          `Claim Available in ${formatTimeLeft(faucetStatus.timeUntilNext) || 'Soon'}`
        ) : (
          `🚰 Claim ${faucetStatus.amount} MWAR Tokens`
        )}
      </button>

      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>💡 Use MWAR tokens to mint heroes and participate in battles.</p>
      </div>
    </div>
  );
}
