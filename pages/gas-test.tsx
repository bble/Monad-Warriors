import { useState } from 'react';
import { useAccount } from 'wagmi';
import GasEstimator from '@/components/GasEstimator';

export default function GasTest() {
  const { address } = useAccount();
  const [heroId, setHeroId] = useState('1');
  const [opponentAddress, setOpponentAddress] = useState('');
  const [opponentHeroId, setOpponentHeroId] = useState('2');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="glass-panel p-6">
          <h1 className="text-2xl font-bold mb-6">⛽ Gas预估测试工具</h1>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                你的英雄ID
              </label>
              <input
                type="number"
                value={heroId}
                onChange={(e) => setHeroId(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg focus:border-blue-400 focus:outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                对手地址
              </label>
              <input
                type="text"
                value={opponentAddress}
                onChange={(e) => setOpponentAddress(e.target.value)}
                placeholder="0x..."
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg focus:border-blue-400 focus:outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                对手英雄ID
              </label>
              <input
                type="number"
                value={opponentHeroId}
                onChange={(e) => setOpponentHeroId(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg focus:border-blue-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="border-t border-gray-600 pt-6">
            <GasEstimator
              heroId={heroId}
              opponentAddress={opponentAddress}
              opponentHeroId={opponentHeroId}
              onGasEstimated={(gasInfo) => {
                console.log('Gas预估结果:', gasInfo);
              }}
            />
          </div>

          <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <div className="text-sm text-yellow-300">
              <div className="font-medium mb-2">💡 使用说明:</div>
              <ul className="space-y-1 text-xs">
                <li>• 填写完整的战斗参数</li>
                <li>• 点击"实时Gas预估"获取准确的gas费用</li>
                <li>• 在MetaMask中手动设置建议的Gas Limit和Gas Price</li>
                <li>• 建议Gas Price = 当前价格 + 10% (更快确认)</li>
              </ul>
            </div>
          </div>

          {address && (
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <div className="text-sm text-blue-300">
                <div className="font-medium">当前连接地址:</div>
                <div className="text-xs font-mono">{address}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
