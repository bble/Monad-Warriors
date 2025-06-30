import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { GAME_CONSTANTS, getClassIcon, getRarityColor } from '@/utils/web3Config';

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

export default function Leaderboard({ category = 'wins' }: LeaderboardProps) {
  const { address } = useAccount();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month'>('all');
  const [isLoading, setIsLoading] = useState(false);

  // 模拟排行榜数据
  const generateMockLeaderboard = (): LeaderboardEntry[] => {
    const mockData: LeaderboardEntry[] = [
      {
        rank: 1,
        address: '0x1234567890123456789012345678901234567890',
        displayName: 'DragonSlayer',
        totalBattles: 156,
        wins: 134,
        losses: 22,
        winRate: 85.9,
        totalRewards: 2340,
        maxWinStreak: 23,
        favoriteHero: { class: 0, rarity: 3, level: 15 },
        lastActive: '2 hours ago'
      },
      {
        rank: 2,
        address: '0x2345678901234567890123456789012345678901',
        displayName: 'MysticMage',
        totalBattles: 142,
        wins: 118,
        losses: 24,
        winRate: 83.1,
        totalRewards: 2180,
        maxWinStreak: 19,
        favoriteHero: { class: 1, rarity: 2, level: 12 },
        lastActive: '1 hour ago'
      },
      {
        rank: 3,
        address: '0x3456789012345678901234567890123456789012',
        displayName: 'ShadowArcher',
        totalBattles: 98,
        wins: 79,
        losses: 19,
        winRate: 80.6,
        totalRewards: 1890,
        maxWinStreak: 16,
        favoriteHero: { class: 2, rarity: 2, level: 11 },
        lastActive: '30 minutes ago'
      },
      {
        rank: 4,
        address: '0x4567890123456789012345678901234567890123',
        displayName: 'StealthAssassin',
        totalBattles: 87,
        wins: 68,
        losses: 19,
        winRate: 78.2,
        totalRewards: 1650,
        maxWinStreak: 14,
        favoriteHero: { class: 3, rarity: 1, level: 9 },
        lastActive: '5 minutes ago'
      },
      {
        rank: 5,
        address: '0x5678901234567890123456789012345678901234',
        displayName: 'HolyPriest',
        totalBattles: 76,
        wins: 58,
        losses: 18,
        winRate: 76.3,
        totalRewards: 1420,
        maxWinStreak: 12,
        favoriteHero: { class: 4, rarity: 1, level: 8 },
        lastActive: '1 day ago'
      }
    ];

    // 添加当前用户到排行榜（如果连接了钱包）
    if (address) {
      const userEntry: LeaderboardEntry = {
        rank: 8,
        address,
        displayName: 'You',
        totalBattles: 45,
        wins: 32,
        losses: 13,
        winRate: 71.1,
        totalRewards: 890,
        maxWinStreak: 8,
        favoriteHero: { class: 0, rarity: 1, level: 6 },
        lastActive: 'Now'
      };
      mockData.push(userEntry);
    }

    // 根据选择的类别排序
    return mockData.sort((a, b) => {
      switch (selectedCategory) {
        case 'wins':
          return b.wins - a.wins;
        case 'winRate':
          return b.winRate - a.winRate;
        case 'rewards':
          return b.totalRewards - a.totalRewards;
        case 'streak':
          return b.maxWinStreak - a.maxWinStreak;
        default:
          return a.rank - b.rank;
      }
    }).map((entry, index) => ({ ...entry, rank: index + 1 }));
  };

  useEffect(() => {
    setIsLoading(true);
    // 模拟API调用延迟
    setTimeout(() => {
      setLeaderboard(generateMockLeaderboard());
      setIsLoading(false);
    }, 500);
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
            <div className="text-2xl font-bold text-blue-400">1,247</div>
            <div className="text-sm text-gray-400">Total Players</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">8,934</div>
            <div className="text-sm text-gray-400">Battles Fought</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">156,780</div>
            <div className="text-sm text-gray-400">MWAR Distributed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">3,421</div>
            <div className="text-sm text-gray-400">Heroes Created</div>
          </div>
        </div>
      </div>
    </div>
  );
}
