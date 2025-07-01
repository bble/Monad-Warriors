import { useState } from 'react';

interface MetaMaskGasGuideProps {
  gasLimit?: string;
  gasPrice?: string;
}

export default function MetaMaskGasGuide({ gasLimit, gasPrice }: MetaMaskGasGuideProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 bg-orange-900/20 border border-orange-500/30 rounded-lg hover:bg-orange-900/30 transition-colors"
      >
        <div className="flex items-center justify-between">
          <span className="text-orange-300 font-medium">
            📖 MetaMask Gas设置教程
          </span>
          <span className="text-orange-300">
            {isOpen ? '▼' : '▶'}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="mt-3 p-4 bg-orange-900/10 border border-orange-500/20 rounded-lg">
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium text-orange-300 mb-2">🔧 手动设置Gas步骤：</h4>
              <ol className="space-y-2 text-xs text-gray-300">
                <li className="flex">
                  <span className="text-orange-400 mr-2">1.</span>
                  <span>点击"开始战斗"按钮，MetaMask会弹出确认窗口</span>
                </li>
                <li className="flex">
                  <span className="text-orange-400 mr-2">2.</span>
                  <span>在MetaMask窗口中，点击"编辑"或"高级"按钮</span>
                </li>
                <li className="flex">
                  <span className="text-orange-400 mr-2">3.</span>
                  <span>选择"高级"或"自定义"gas设置</span>
                </li>
                <li className="flex">
                  <span className="text-orange-400 mr-2">4.</span>
                  <span>手动输入以下数值：</span>
                </li>
              </ol>
            </div>

            {gasLimit && gasPrice && (
              <div className="bg-gray-800/50 p-3 rounded border-l-4 border-orange-500">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gas Limit:</span>
                    <span className="text-white font-mono">{gasLimit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gas Price:</span>
                    <span className="text-white font-mono">{gasPrice} gwei</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h4 className="font-medium text-red-300 mb-2">⚠️ 重要提醒：</h4>
              <ul className="space-y-1 text-xs text-gray-300">
                <li className="flex">
                  <span className="text-red-400 mr-2">•</span>
                  <span>不要使用MetaMask的默认gas设置（通常太低）</span>
                </li>
                <li className="flex">
                  <span className="text-red-400 mr-2">•</span>
                  <span>战斗函数比较复杂，需要更多gas</span>
                </li>
                <li className="flex">
                  <span className="text-red-400 mr-2">•</span>
                  <span>Gas不足会导致交易失败但仍然扣费</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-green-300 mb-2">💡 省钱技巧：</h4>
              <ul className="space-y-1 text-xs text-gray-300">
                <li className="flex">
                  <span className="text-green-400 mr-2">•</span>
                  <span>Gas Price设置为15-20 gwei即可（测试网不需要太高）</span>
                </li>
                <li className="flex">
                  <span className="text-green-400 mr-2">•</span>
                  <span>避免在网络拥堵时进行交易</span>
                </li>
                <li className="flex">
                  <span className="text-green-400 mr-2">•</span>
                  <span>使用我们的预估工具获取准确的gas限制</span>
                </li>
              </ul>
            </div>

            <div className="pt-3 border-t border-orange-500/20">
              <div className="text-xs text-orange-300">
                <span className="font-medium">🎯 目标：</span>
                确保交易成功的同时最小化gas费用消耗
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
