import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { GAME_CONSTANTS, getClassIcon, getRarityColor } from '@/utils/web3Config';
import { CONTRACT_ADDRESSES, GAME_CORE_ABI } from '@/utils/contractABI';
import { formatEther } from 'ethers';
import PlayerDataViewer from './PlayerDataViewer';

interface LeaderboardEntry {
  rank: number;
  address: string;
  displayName: string;
  totalBattles: number;
  wins: number;
  losses: number;
  winRate: number;
  totalRewards: number;
  maxWinStreak: number;
  favoriteHero: {
    class: number;
    rarity: number;
    level: number;
  };
  lastActive: string;
}

interface LeaderboardProps {
  category?: 'wins' | 'winRate' | 'rewards' | 'streak';
}

interface GlobalStats {
  totalPlayers: number;
  totalBattles: number;
  totalRewardsDistributed: number;
  totalHeroes: number;
}

export default function Leaderboard({ category = 'wins' }: LeaderboardProps) {
  const { address } = useAccount();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month'>('all');
  const [isLoading, setIsLoading] = useState(false);

  // 读取全局统计数据
  const { data: globalStatsData } = useReadContract({
    address: CONTRACT_ADDRESSES.GAME_CORE as `0x${string}`,
    abi: GAME_CORE_ABI,
    functionName: 'getGlobalStats',
  }) as { data: [bigint, bigint, bigint, bigint] | undefined };

  // 转换全局统计数据
  const globalStats: GlobalStats = globalStatsData ? {
    totalPlayers: Number(globalStatsData[0]),
    totalBattles: Number(globalStatsData[1]),
    totalRewardsDistributed: Math.round(Number(formatEther(globalStatsData[2]))),
    totalHeroes: Number(globalStatsData[3])
  } : {
    totalPlayers: 0,
    totalBattles: 0,
    totalRewardsDistributed: 0,
    totalHeroes: 0
  };

  // 获取真实排行榜数据
  const fetchLeaderboardData = async (): Promise<LeaderboardEntry[]> => {
    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          timeFilter: timeFilter
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.leaderboard || [];
      }
    } catch (error) {
      // 静默处理错误
    }

    // 如果API失败，返回空数组
    return [];
  };

  useEffect(() => {
    const loadLeaderboard = async () => {
      setIsLoading(true);
      try {
        const data = await fetchLeaderboardData();
        setLeaderboard(data);
      } catch (error) {
        // 如果获取失败，显示空列表
        setLeaderboard([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboard();
  }, [selectedCategory, timeFilter, address]);

  const formatAddress = (addr: string): string => {
    if (addr === address) return 'You';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getCategoryValue = (entry: LeaderboardEntry): string => {
    switch (selectedCategory) {
      case 'wins':
        return entry.wins.toString();
      case 'winRate':
        return `${entry.winRate.toFixed(1)}%`;
      case 'rewards':
        return `${entry.totalRewards} MWAR`;
      case 'streak':
        return entry.maxWinStreak.toString();
      default:
        return entry.wins.toString();
    }
  };

  const getRankIcon = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold">🏆 Leaderboard</h2>
          
          <div className="flex flex-wrap gap-2">
            {/* Category Filter */}
            <div className="flex bg-gray-800 rounded-lg p-1">
              {[
                { key: 'wins', label: 'Wins', icon: '🏆' },
                { key: 'winRate', label: 'Win Rate', icon: '📊' },
                { key: 'rewards', label: 'Rewards', icon: '💰' },
                { key: 'streak', label: 'Streak', icon: '🔥' }
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key as any)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    selectedCategory === key
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>

            {/* Time Filter */}
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Time</option>
              <option value="month">This Month</option>
              <option value="week">This Week</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="glass-panel p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="loading-spinner"></div>
            <span className="ml-2">Loading leaderboard...</span>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-gray-400 border-b border-gray-600">
              <div className="col-span-1">Rank</div>
              <div className="col-span-3">Player</div>
              <div className="col-span-2">Hero</div>
              <div className="col-span-2">Battles</div>
              <div className="col-span-2">{selectedCategory === 'wins' ? 'Wins' : 
                                        selectedCategory === 'winRate' ? 'Win Rate' :
                                        selectedCategory === 'rewards' ? 'Rewards' : 'Max Streak'}</div>
              <div className="col-span-2">Last Active</div>
            </div>

            {/* Leaderboard Entries */}
            {leaderboard.map((entry) => (
              <div
                key={entry.address}
                className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-gray-800/50 ${
                  entry.address === address ? 'bg-blue-900/30 border border-blue-500/30' : ''
                }`}
              >
                {/* Rank */}
                <div className="col-span-1 flex items-center">
                  <span className="text-lg font-bold">
                    {getRankIcon(entry.rank)}
                  </span>
                </div>

                {/* Player */}
                <div className="col-span-3 flex items-center space-x-2">
                  <div>
                    <div className="font-semibold">
                      {entry.displayName}
                    </div>
                    <div className="text-sm text-gray-400">
                      {formatAddress(entry.address)}
                    </div>
                  </div>
                </div>

                {/* Hero */}
                <div className="col-span-2 flex items-center space-x-2">
                  <span className="text-xl">{getClassIcon(entry.favoriteHero.class)}</span>
                  <div>
                    <div className={`text-sm ${getRarityColor(entry.favoriteHero.rarity)}`}>
                      {GAME_CONSTANTS.RARITY_NAMES[entry.favoriteHero.rarity]}
                    </div>
                    <div className="text-xs text-gray-400">
                      Lv.{entry.favoriteHero.level}
                    </div>
                  </div>
                </div>

                {/* Battles */}
                <div className="col-span-2 flex items-center">
                  <div>
                    <div className="font-semibold">{entry.totalBattles}</div>
                    <div className="text-xs text-gray-400">
                      {entry.wins}W / {entry.losses}L
                    </div>
                  </div>
                </div>

                {/* Category Value */}
                <div className="col-span-2 flex items-center">
                  <div className="font-bold text-yellow-400">
                    {getCategoryValue(entry)}
                  </div>
                </div>

                {/* Last Active */}
                <div className="col-span-2 flex items-center">
                  <div className="text-sm text-gray-400">
                    {entry.lastActive}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold mb-4">📈 Global Stats</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {globalStats.totalPlayers.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Total Players</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {globalStats.totalBattles.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Battles Fought</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {globalStats.totalRewardsDistributed.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">MWAR Distributed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {globalStats.totalHeroes.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Heroes Created</div>
          </div>
        </div>
      </div>

      {/* 玩家数据查看器 */}
      <PlayerDataViewer />
    </div>
  );
}
