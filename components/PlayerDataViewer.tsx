import { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES, GAME_CORE_ABI } from '@/utils/contractABI';
import { formatEther } from 'viem';

export default function PlayerDataViewer() {
  const { address } = useAccount();
  const [targetAddress, setTargetAddress] = useState('');
  const [showData, setShowData] = useState(false);

  // 读取玩家统计数据
  const { data: playerStats, refetch: refetchStats } = useReadContract({
    address: CONTRACT_ADDRESSES.GAME_CORE as `0x${string}`,
    abi: GAME_CORE_ABI,
    functionName: 'playerStats',
    args: [targetAddress as `0x${string}`],
    query: { enabled: showData && !!targetAddress }
  }) as { data: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint] | undefined, refetch: any };

  // 读取排行榜
  const { data: leaderboard, refetch: refetchLeaderboard } = useReadContract({
    address: CONTRACT_ADDRESSES.GAME_CORE as `0x${string}`,
    abi: GAME_CORE_ABI,
    functionName: 'getLeaderboard',
  }) as { data: string[] | undefined, refetch: any };

  // 读取战斗历史长度
  const { data: battleCount, refetch: refetchBattles } = useReadContract({
    address: CONTRACT_ADDRESSES.GAME_CORE as `0x${string}`,
    abi: GAME_CORE_ABI,
    functionName: 'getBattleHistoryLength',
  }) as { data: bigint | undefined, refetch: any };

  const handleQuery = () => {
    const addr = targetAddress || address;
    if (addr) {
      setTargetAddress(addr);
      setShowData(true);
      setTimeout(() => {
        refetchStats();
        refetchLeaderboard();
        refetchBattles();
      }, 100);
    }
  };

  const formatPlayerStats = (stats: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint]) => {
    const [totalBattles, wins, losses, draws, totalRewards, lastBattleTime, winStreak, maxWinStreak] = stats;
    
    const winRate = totalBattles > 0n ? Number((wins * 100n) / totalBattles) : 0;
    
    return {
      totalBattles: Number(totalBattles),
      wins: Number(wins),
      losses: Number(losses),
      draws: Number(draws),
      totalRewards: formatEther(totalRewards),
      lastBattleTime: Number(lastBattleTime),
      winStreak: Number(winStreak),
      maxWinStreak: Number(maxWinStreak),
      winRate
    };
  };

  return (
    <div className="glass-panel p-6">
      <h3 className="text-xl font-semibold mb-4">🔍 玩家数据查看器</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            查询地址 (留空查询自己)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              placeholder={address || "请连接钱包"}
              className="flex-1 p-3 bg-gray-800 border border-gray-600 rounded-lg focus:border-blue-400 focus:outline-none"
            />
            <button
              onClick={handleQuery}
              disabled={!address}
              className="btn-primary px-6 disabled:opacity-50"
            >
              查询
            </button>
          </div>
        </div>

        {/* 全局统计 */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="text-sm text-blue-300">
              <div className="font-medium">📊 全局统计</div>
              <div className="text-xs mt-1">
                总战斗数: {battleCount ? Number(battleCount) : 0}
              </div>
              <div className="text-xs">
                排行榜玩家: {leaderboard ? leaderboard.length : 0}
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
            <div className="text-sm text-green-300">
              <div className="font-medium">🏆 排行榜前3</div>
              <div className="text-xs mt-1">
                {leaderboard && leaderboard.length > 0 ? (
                  leaderboard.slice(0, 3).map((addr, i) => (
                    <div key={i}>#{i + 1}: {addr.slice(0, 6)}...{addr.slice(-4)}</div>
                  ))
                ) : (
                  <div>暂无排行榜数据</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 玩家统计 */}
        {showData && playerStats && (
          <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
            <div className="text-sm text-purple-300">
              <div className="font-medium mb-2">👤 玩家统计 ({targetAddress.slice(0, 6)}...{targetAddress.slice(-4)})</div>
              
              {(() => {
                const stats = formatPlayerStats(playerStats);
                return (
                  <div className="grid md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <div>总战斗数: <span className="text-white">{stats.totalBattles}</span></div>
                      <div>胜利: <span className="text-green-400">{stats.wins}</span></div>
                      <div>失败: <span className="text-red-400">{stats.losses}</span></div>
                      <div>平局: <span className="text-yellow-400">{stats.draws}</span></div>
                    </div>
                    <div className="space-y-1">
                      <div>胜率: <span className="text-white">{stats.winRate.toFixed(1)}%</span></div>
                      <div>总奖励: <span className="text-yellow-400">{stats.totalRewards} MWAR</span></div>
                      <div>当前连胜: <span className="text-white">{stats.winStreak}</span></div>
                      <div>最大连胜: <span className="text-white">{stats.maxWinStreak}</span></div>
                    </div>
                  </div>
                );
              })()}
              
              {playerStats[5] > 0n && (
                <div className="mt-2 pt-2 border-t border-purple-500/20 text-xs">
                  最后战斗: {new Date(Number(playerStats[5]) * 1000).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}

        {showData && playerStats && Number(playerStats[0]) === 0 && (
          <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <div className="text-sm text-yellow-300">
              ⚠️ 该地址还没有战斗记录
            </div>
          </div>
        )}

        <div className="text-xs text-gray-400">
          💡 提示: 排行榜需要至少1场战斗才能上榜。如果你有战斗记录但不在排行榜上，可能需要重新部署合约来更新排行榜逻辑。
        </div>
      </div>
    </div>
  );
}
