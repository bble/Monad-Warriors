import { useAccount, useReadContract } from 'wagmi';
import { formatMWAR } from '@/utils/web3Config';
import {
  CONTRACT_ADDRESSES,
  GAME_CORE_ABI,
  MWAR_TOKEN_ABI
} from '@/utils/contractABI';

export default function PlayerStats() {
  const { address } = useAccount();

  // 读取玩家统计数据
  const { data: playerStats } = useReadContract({
    address: CONTRACT_ADDRESSES.GAME_CORE as `0x${string}`,
    abi: GAME_CORE_ABI,
    functionName: 'playerStats',
    args: [address as `0x${string}`],
  }) as { data: { totalBattles: bigint; wins: bigint; losses: bigint; draws: bigint; totalRewards: bigint; lastBattleTime: bigint; winStreak: bigint; maxWinStreak: bigint } | undefined };

  // 读取MWAR余额
  const { data: mwarBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.MWAR_TOKEN as `0x${string}`,
    abi: MWAR_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  }) as { data: bigint | undefined };

  // 读取胜率
  const { data: winRate } = useReadContract({
    address: CONTRACT_ADDRESSES.GAME_CORE as `0x${string}`,
    abi: GAME_CORE_ABI,
    functionName: 'getPlayerWinRate',
    args: [address as `0x${string}`],
  }) as { data: bigint | undefined };

  const totalBattles = playerStats?.totalBattles ? Number(playerStats.totalBattles) : 0;
  const wins = playerStats?.wins ? Number(playerStats.wins) : 0;
  const losses = playerStats?.losses ? Number(playerStats.losses) : 0;
  const draws = playerStats?.draws ? Number(playerStats.draws) : 0;
  const totalRewards = playerStats?.totalRewards || BigInt(0);
  const winStreak = playerStats?.winStreak ? Number(playerStats.winStreak) : 0;
  const maxWinStreak = playerStats?.maxWinStreak ? Number(playerStats.maxWinStreak) : 0;

  const achievements = [
    {
      title: 'First Victory',
      description: 'Win your first battle',
      completed: wins > 0,
      icon: '🏆',
    },
    {
      title: 'Warrior',
      description: 'Win 10 battles',
      completed: wins >= 10,
      icon: '⚔️',
    },
    {
      title: 'Champion',
      description: 'Win 50 battles',
      completed: wins >= 50,
      icon: '👑',
    },
    {
      title: 'Streak Master',
      description: 'Achieve a 5-win streak',
      completed: maxWinStreak >= 5,
      icon: '🔥',
    },
    {
      title: 'Veteran',
      description: 'Play 100 battles',
      completed: totalBattles >= 100,
      icon: '🛡️',
    },
    {
      title: 'Rich Warrior',
      description: 'Earn 1000 MWAR',
      completed: Number(totalRewards) >= 1000 * 1e18,
      icon: '💰',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="glass-panel p-6">
        <h2 className="text-2xl font-bold mb-6">Player Statistics</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {totalBattles || 0}
            </div>
            <div className="text-gray-400">Total Battles</div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {winRate ? `${Number(winRate)}%` : totalBattles > 0 ? `${((wins / totalBattles) * 100).toFixed(1)}%` : '0%'}
            </div>
            <div className="text-gray-400">Win Rate</div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {winStreak || 0}
            </div>
            <div className="text-gray-400">Current Streak</div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {formatMWAR(totalRewards)}
            </div>
            <div className="text-gray-400">Total Earned</div>
          </div>
        </div>
      </div>

      {/* Detailed Battle Stats */}
      <div className="glass-panel p-6">
        <h3 className="text-xl font-semibold mb-4">Battle Record</h3>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-900/20 rounded-lg border border-green-500/30">
            <div className="text-2xl font-bold text-green-400 mb-2">{wins || 0}</div>
            <div className="text-green-300">Victories</div>
            <div className="text-sm text-gray-400 mt-1">
              {totalBattles > 0 ? ((wins / totalBattles) * 100).toFixed(1) : 0}%
            </div>
          </div>

          <div className="text-center p-4 bg-red-900/20 rounded-lg border border-red-500/30">
            <div className="text-2xl font-bold text-red-400 mb-2">{losses || 0}</div>
            <div className="text-red-300">Defeats</div>
            <div className="text-sm text-gray-400 mt-1">
              {totalBattles > 0 ? ((losses / totalBattles) * 100).toFixed(1) : 0}%
            </div>
          </div>

          <div className="text-center p-4 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
            <div className="text-2xl font-bold text-yellow-400 mb-2">{draws || 0}</div>
            <div className="text-yellow-300">Draws</div>
            <div className="text-sm text-gray-400 mt-1">
              {totalBattles > 0 ? ((draws / totalBattles) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Streak Information */}
      <div className="glass-panel p-6">
        <h3 className="text-xl font-semibold mb-4">Streak Records</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="text-center p-4 bg-orange-900/20 rounded-lg border border-orange-500/30">
            <div className="text-2xl font-bold text-orange-400 mb-2">{winStreak || 0}</div>
            <div className="text-orange-300">Current Win Streak</div>
            <div className="text-sm text-gray-400 mt-1">
              {winStreak > 0 ? '🔥 On fire!' : 'Start a new streak!'}
            </div>
          </div>
          
          <div className="text-center p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
            <div className="text-2xl font-bold text-purple-400 mb-2">{maxWinStreak || 0}</div>
            <div className="text-purple-300">Best Win Streak</div>
            <div className="text-sm text-gray-400 mt-1">
              Personal record
            </div>
          </div>
        </div>
      </div>

      {/* Earnings */}
      <div className="glass-panel p-6">
        <h3 className="text-xl font-semibold mb-4">Earnings</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="text-center p-4 bg-green-900/20 rounded-lg border border-green-500/30">
            <div className="text-2xl font-bold text-green-400 mb-2">
              {formatMWAR(totalRewards)}
            </div>
            <div className="text-green-300">Total Earned</div>
            <div className="text-sm text-gray-400 mt-1">From battles</div>
          </div>
          
          <div className="text-center p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
            <div className="text-2xl font-bold text-blue-400 mb-2">
              {mwarBalance ? formatMWAR(mwarBalance) : '0.00'}
            </div>
            <div className="text-blue-300">Current Balance</div>
            <div className="text-sm text-gray-400 mt-1">MWAR tokens</div>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="glass-panel p-6">
        <h3 className="text-xl font-semibold mb-4">Achievements</h3>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((achievement, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                achievement.completed
                  ? 'border-yellow-400 bg-yellow-400/20'
                  : 'border-gray-600 bg-gray-800/50'
              }`}
            >
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl">{achievement.icon}</span>
                <div>
                  <div className={`font-semibold ${
                    achievement.completed ? 'text-yellow-400' : 'text-gray-400'
                  }`}>
                    {achievement.title}
                  </div>
                  <div className="text-sm text-gray-500">
                    {achievement.description}
                  </div>
                </div>
              </div>
              {achievement.completed && (
                <div className="text-xs text-yellow-300 font-semibold">
                  ✓ COMPLETED
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Progress to Next Level */}
      <div className="glass-panel p-6">
        <h3 className="text-xl font-semibold mb-4">Progress</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Next Achievement: Warrior (10 wins)</span>
              <span>{wins}/10</span>
            </div>
            <div className="stat-bar">
              <div 
                className="stat-fill" 
                style={{ width: `${Math.min((wins / 10) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Battle Experience</span>
              <span>{totalBattles}/100</span>
            </div>
            <div className="stat-bar">
              <div 
                className="stat-fill" 
                style={{ width: `${Math.min((totalBattles / 100) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
