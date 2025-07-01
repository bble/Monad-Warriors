import { useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { CONTRACT_ADDRESSES, GAME_CORE_ABI } from '@/utils/contractABI';
import { formatEther, formatGwei } from 'viem';
import MetaMaskGasGuide from './MetaMaskGasGuide';

interface GasEstimatorProps {
  heroId?: string;
  opponentAddress?: string;
  opponentHeroId?: string;
  onGasEstimated?: (gasInfo: any) => void;
}

export default function GasEstimator({ 
  heroId, 
  opponentAddress, 
  opponentHeroId, 
  onGasEstimated 
}: GasEstimatorProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [gasInfo, setGasInfo] = useState<any>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [error, setError] = useState<string>('');

  const estimateGas = async () => {
    if (!publicClient || !address || !heroId || !opponentAddress || !opponentHeroId) {
      setError('请填写完整的战斗信息');
      return;
    }

    setIsEstimating(true);
    setError('');
    setGasInfo(null);

    try {
      console.log('🔍 开始gas预估...');
      console.log('参数:', { heroId, opponentAddress, opponentHeroId, from: address });

      // 1. 获取当前网络gas价格
      const gasPrice = await publicClient.getGasPrice();
      console.log('当前gas价格:', formatGwei(gasPrice), 'gwei');

      // 2. 预估gas限制
      const gasEstimate = await publicClient.estimateContractGas({
        address: CONTRACT_ADDRESSES.GAME_CORE as `0x${string}`,
        abi: GAME_CORE_ABI,
        functionName: 'startPvPBattle',
        args: [
          BigInt(heroId),
          opponentAddress as `0x${string}`,
          BigInt(opponentHeroId)
        ],
        account: address as `0x${string}`,
      });

      console.log('预估gas限制:', gasEstimate.toString());

      // 3. 添加更大的安全边际（80%），因为战斗函数比较复杂
      const gasWithBuffer = gasEstimate + (gasEstimate * BigInt(80)) / BigInt(100);

      // 4. 设置最小gas限制（基于你的失败交易，至少需要800,000）
      const minGasLimit = BigInt(800000);
      const finalGasLimit = gasWithBuffer > minGasLimit ? gasWithBuffer : minGasLimit;
      
      // 5. 计算费用
      const estimatedCost = (finalGasLimit * gasPrice);
      const costInEther = formatEther(estimatedCost);

      // 6. 建议的gas价格（降低到15-20 gwei，节省费用）
      const suggestedGasPrice = BigInt(20000000000); // 20 gwei

      const result = {
        gasLimit: finalGasLimit.toString(),
        gasPrice: formatGwei(gasPrice),
        suggestedGasPrice: formatGwei(suggestedGasPrice),
        estimatedCost: costInEther,
        estimatedCostWei: estimatedCost.toString(),
        originalEstimate: gasEstimate.toString(),
        minGasUsed: minGasLimit.toString()
      };

      console.log('✅ Gas预估完成:', result);
      setGasInfo(result);
      onGasEstimated?.(result);

    } catch (error: any) {
      console.error('❌ Gas预估失败:', error);
      
      let errorMessage = 'Gas预估失败: ';
      if (error.message?.includes('insufficient funds')) {
        errorMessage += '账户余额不足';
      } else if (error.message?.includes('execution reverted')) {
        errorMessage += '合约执行失败，请检查英雄所有权和参数';
      } else if (error.message?.includes('invalid address')) {
        errorMessage += '地址格式错误';
      } else {
        errorMessage += error.message || '未知错误';
      }
      
      setError(errorMessage);
    } finally {
      setIsEstimating(false);
    }
  };

  // 获取实时网络状态
  const getNetworkStatus = async () => {
    if (!publicClient) return;

    try {
      const [gasPrice, blockNumber] = await Promise.all([
        publicClient.getGasPrice(),
        publicClient.getBlockNumber()
      ]);

      return {
        gasPrice: formatGwei(gasPrice),
        blockNumber: blockNumber.toString()
      };
    } catch (error) {
      console.error('获取网络状态失败:', error);
      return null;
    }
  };

  const [networkStatus, setNetworkStatus] = useState<any>(null);

  const refreshNetworkStatus = async () => {
    const status = await getNetworkStatus();
    setNetworkStatus(status);
  };

  return (
    <div className="space-y-4">
      {/* 网络状态 */}
      <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
        <div className="text-sm">
          <span className="text-gray-400">网络状态:</span>
          {networkStatus ? (
            <span className="ml-2 text-green-400">
              Gas: {networkStatus.gasPrice} gwei | 块高: {networkStatus.blockNumber}
            </span>
          ) : (
            <span className="ml-2 text-gray-400">未获取</span>
          )}
        </div>
        <button
          onClick={refreshNetworkStatus}
          className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded"
        >
          刷新
        </button>
      </div>

      {/* Gas预估按钮 */}
      <button
        onClick={estimateGas}
        disabled={isEstimating || !heroId || !opponentAddress || !opponentHeroId}
        className="w-full btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isEstimating ? '🔄 预估中...' : '🔍 实时Gas预估'}
      </button>

      {/* 错误信息 */}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
          <div className="text-sm text-red-300">❌ {error}</div>
        </div>
      )}

      {/* Gas预估结果 */}
      {gasInfo && (
        <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
          <div className="text-sm text-green-300">
            <div className="font-medium mb-2">⛽ Gas预估结果:</div>
            <div className="space-y-1 text-xs">
              <div>• 原始预估: <span className="text-gray-400">{gasInfo.originalEstimate}</span></div>
              <div>• 最终Gas限制: <span className="text-white font-bold">{gasInfo.gasLimit}</span></div>
              <div>• 当前Gas价格: <span className="text-white">{gasInfo.gasPrice} gwei</span></div>
              <div>• 建议Gas价格: <span className="text-white">{gasInfo.suggestedGasPrice} gwei</span></div>
              <div>• 预估费用: <span className="text-white">{gasInfo.estimatedCost} MON</span></div>
              <div className="pt-2 border-t border-green-500/20">
                <div className="text-yellow-300">🚨 重要：在MetaMask中手动设置</div>
                <div className="bg-yellow-900/30 p-2 rounded mt-1">
                  <div>Gas Limit: <span className="text-white font-mono text-sm">{gasInfo.gasLimit}</span></div>
                  <div>Gas Price: <span className="text-white font-mono text-sm">{gasInfo.suggestedGasPrice} gwei</span></div>
                </div>
                <div className="text-red-300 mt-1">⚠️ 不要使用默认的500,000 gas limit！</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MetaMask设置指南 */}
      {gasInfo && (
        <MetaMaskGasGuide
          gasLimit={gasInfo.gasLimit}
          gasPrice={gasInfo.suggestedGasPrice}
        />
      )}
    </div>
  );
}
