import { useEffect, useState } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';

interface TransactionStatusProps {
  hash?: `0x${string}`;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

export default function TransactionStatus({
  hash,
  onSuccess,
  onError,
  successMessage = 'Transaction successful!',
  errorMessage = 'Transaction failed'
}: TransactionStatusProps) {
  const [isVisible, setIsVisible] = useState(false);

  const { 
    data: receipt, 
    isLoading, 
    isSuccess, 
    isError, 
    error 
  } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (hash) {
      setIsVisible(true);
    }
  }, [hash]);

  useEffect(() => {
    if (isSuccess) {
      onSuccess?.();
      setTimeout(() => setIsVisible(false), 5000);
    }
  }, [isSuccess, onSuccess]);

  useEffect(() => {
    if (isError && error) {
      onError?.(error);
      setTimeout(() => setIsVisible(false), 8000);
    }
  }, [isError, error, onError]);

  if (!isVisible || !hash) return null;

  const getExplorerUrl = (txHash: string) => {
    return `https://testnet.monadexplorer.com/tx/${txHash}`;
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="glass-panel p-4 border-l-4 border-blue-500">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {isLoading && (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
            )}
            {isSuccess && <span className="text-green-400 text-xl">✅</span>}
            {isError && <span className="text-red-400 text-xl">❌</span>}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white">
              {isLoading && 'Transaction Pending'}
              {isSuccess && successMessage}
              {isError && errorMessage}
            </div>
            
            <div className="mt-1 text-xs text-gray-400">
              <a
                href={getExplorerUrl(hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400 underline"
              >
                View on Explorer
              </a>
            </div>
            
            {isError && error && (
              <div className="mt-2 text-xs text-red-300">
                {error.message.slice(0, 100)}...
              </div>
            )}
            
            {isSuccess && receipt && (
              <div className="mt-2 text-xs text-green-300">
                Block: {receipt.blockNumber.toString()}
              </div>
            )}
          </div>
          
          <button
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
