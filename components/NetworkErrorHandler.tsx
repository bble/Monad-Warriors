import { useEffect, useState } from 'react';

interface NetworkError {
  type: 'walletconnect' | 'api' | 'rpc' | 'unknown';
  message: string;
  timestamp: number;
}

export default function NetworkErrorHandler() {
  const [errors, setErrors] = useState<NetworkError[]>([]);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    // 监听全局错误
    const handleError = (event: ErrorEvent) => {
      const error = event.error || event.message;
      let errorType: NetworkError['type'] = 'unknown';
      
      if (error.toString().includes('walletconnect') || error.toString().includes('pulse.walletconnect')) {
        errorType = 'walletconnect';
      } else if (error.toString().includes('api/')) {
        errorType = 'api';
      } else if (error.toString().includes('rpc') || error.toString().includes('testnet-rpc')) {
        errorType = 'rpc';
      }

      const newError: NetworkError = {
        type: errorType,
        message: error.toString(),
        timestamp: Date.now()
      };

      setErrors(prev => [...prev.slice(-4), newError]); // 只保留最近5个错误
    };

    // 监听未处理的Promise拒绝
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      let errorType: NetworkError['type'] = 'unknown';
      
      if (error.toString().includes('walletconnect')) {
        errorType = 'walletconnect';
      } else if (error.toString().includes('api/')) {
        errorType = 'api';
      } else if (error.toString().includes('rpc')) {
        errorType = 'rpc';
      }

      const newError: NetworkError = {
        type: errorType,
        message: error.toString(),
        timestamp: Date.now()
      };

      setErrors(prev => [...prev.slice(-4), newError]);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const getErrorIcon = (type: NetworkError['type']) => {
    switch (type) {
      case 'walletconnect': return '🔗';
      case 'api': return '🔌';
      case 'rpc': return '⛓️';
      default: return '⚠️';
    }
  };

  const getErrorColor = (type: NetworkError['type']) => {
    switch (type) {
      case 'walletconnect': return 'text-blue-400';
      case 'api': return 'text-yellow-400';
      case 'rpc': return 'text-purple-400';
      default: return 'text-red-400';
    }
  };

  const clearErrors = () => {
    setErrors([]);
    setShowErrors(false);
  };

  if (errors.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!showErrors ? (
        <button
          onClick={() => setShowErrors(true)}
          className="bg-red-600/80 hover:bg-red-600 text-white p-3 rounded-full shadow-lg transition-colors"
          title={`${errors.length} network error(s) detected`}
        >
          <span className="text-sm font-bold">{errors.length}</span>
          <span className="ml-1">⚠️</span>
        </button>
      ) : (
        <div className="bg-gray-900/95 border border-red-500/30 rounded-lg p-4 max-w-sm shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-red-400">Network Issues</h3>
            <button
              onClick={() => setShowErrors(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {errors.map((error, index) => (
              <div key={index} className="text-xs p-2 bg-gray-800/50 rounded border-l-2 border-red-500/50">
                <div className="flex items-center gap-2 mb-1">
                  <span>{getErrorIcon(error.type)}</span>
                  <span className={`font-medium ${getErrorColor(error.type)}`}>
                    {error.type.toUpperCase()}
                  </span>
                  <span className="text-gray-500">
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-gray-300 truncate" title={error.message}>
                  {error.message.length > 50 ? error.message.substring(0, 50) + '...' : error.message}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-3 flex gap-2">
            <button
              onClick={clearErrors}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded"
            >
              Clear
            </button>
            <button
              onClick={() => window.location.reload()}
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded"
            >
              Reload
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-400">
            💡 These errors are usually temporary and don't affect core functionality.
          </div>
        </div>
      )}
    </div>
  );
}
