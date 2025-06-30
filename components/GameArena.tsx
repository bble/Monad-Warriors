import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import {
  GAME_CONSTANTS,
  getRarityColor,
  getClassIcon
} from '@/utils/web3Config';
import {
  CONTRACT_ADDRESSES,
  GAME_CORE_ABI
} from '@/utils/contractABI';

interface BattleHero {
  tokenId: number;
  power: number;
  rarity: number;
  class: number;
  level: number;
}

export default function GameArena() {
  const { address } = useAccount();
  const [selectedHero, setSelectedHero] = useState<BattleHero | null>(null);
  const [opponentAddress, setOpponentAddress] = useState('');
  const [opponentHeroId, setOpponentHeroId] = useState('');
  const [battleResult, setBattleResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 读取玩家统计数据
  const { data: playerStats } = useReadContract({
    address: CONTRACT_ADDRESSES.GAME_CORE as `0x${string}`,
    abi: GAME_CORE_ABI,
    functionName: 'playerStats',
    args: [address as `0x${string}`],
  }) as { data: { totalBattles: bigint; wins: bigint; losses: bigint; draws: bigint; totalRewards: bigint; lastBattleTime: bigint; winStreak: bigint; maxWinStreak: bigint } | undefined };

  // 读取胜率
  const { data: winRate } = useReadContract({
    address: CONTRACT_ADDRESSES.GAME_CORE as `0x${string}`,
    abi: GAME_CORE_ABI,
    functionName: 'getPlayerWinRate',
    args: [address as `0x${string}`],
  }) as { data: bigint | undefined };

  // 开始战斗
  const { writeContract, data: battleHash } = useWriteContract();
  
  const { isLoading: isBattleLoading, isSuccess: isBattleSuccess } = useWaitForTransactionReceipt({
    hash: battleHash,
  });

  // 模拟英雄数据 (实际应用中应该从合约读取)
  const mockHeroes: BattleHero[] = [
    { tokenId: 1, power: 450, rarity: 1, class: 0, level: 5 },
    { tokenId: 2, power: 380, rarity: 0, class: 1, level: 3 },
    { tokenId: 3, power: 620, rarity: 2, class: 2, level: 8 },
  ];

  const handleStartBattle = async () => {
    if (!selectedHero || !opponentAddress || !opponentHeroId) return;
    
    setIsLoading(true);
    setBattleResult(null);
    
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.GAME_CORE as `0x${string}`,
        abi: GAME_CORE_ABI,
        functionName: 'startPvPBattle',
        args: [
          BigInt(selectedHero.tokenId),
          opponentAddress as `0x${string}`,
          BigInt(opponentHeroId)
        ],
      });
    } catch (error) {
      console.error('Battle failed:', error);
      setBattleResult('Battle failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isBattleSuccess) {
      setBattleResult('Battle completed! Check your stats for results.');
    }
  }, [isBattleSuccess]);

  return (
    <div className="space-y-6">
      {/* Player Stats */}
      <div className="glass-panel p-6">
        <h2 className="text-2xl font-bold mb-4">Battle Arena</h2>
        
        <div className="grid md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {playerStats ? playerStats.wins.toString() : '0'}
            </div>
            <div className="text-sm text-gray-400">Wins</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">
              {playerStats ? playerStats.losses.toString() : '0'}
            </div>
            <div className="text-sm text-gray-400">Losses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {playerStats ? playerStats.draws.toString() : '0'}
            </div>
            <div className="text-sm text-gray-400">Draws</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {winRate ? `${winRate.toString()}%` : '0%'}
            </div>
            <div className="text-sm text-gray-400">Win Rate</div>
          </div>
        </div>
      </div>

      {/* Hero Selection */}
      <div className="glass-panel p-6">
        <h3 className="text-xl font-semibold mb-4">Select Your Hero</h3>
        
        <div className="grid md:grid-cols-3 gap-4">
          {mockHeroes.map((hero) => (
            <button
              key={hero.tokenId}
              onClick={() => setSelectedHero(hero)}
              className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                selectedHero?.tokenId === hero.tokenId
                  ? 'border-blue-400 bg-blue-400/20'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl">{getClassIcon(hero.class)}</span>
                <div className="text-left">
                  <div className="font-semibold">
                    {GAME_CONSTANTS.CLASS_NAMES[hero.class]}
                  </div>
                  <div className={`text-sm ${getRarityColor(hero.rarity)}`}>
                    {GAME_CONSTANTS.RARITY_NAMES[hero.rarity]}
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span>Level {hero.level}</span>
                <span className="text-yellow-400">⚡ {hero.power}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Battle Setup */}
      <div className="glass-panel p-6">
        <h3 className="text-xl font-semibold mb-4">Challenge Opponent</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Opponent Address
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
              Opponent Hero ID
            </label>
            <input
              type="number"
              value={opponentHeroId}
              onChange={(e) => setOpponentHeroId(e.target.value)}
              placeholder="Hero Token ID"
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg focus:border-blue-400 focus:outline-none"
            />
          </div>
          
          <button
            onClick={handleStartBattle}
            disabled={!selectedHero || !opponentAddress || !opponentHeroId || isLoading || isBattleLoading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading || isBattleLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="loading-spinner"></div>
                <span>Starting Battle...</span>
              </div>
            ) : (
              'Start Battle'
            )}
          </button>
        </div>
      </div>

      {/* Battle Result */}
      {battleResult && (
        <div className="glass-panel p-6">
          <h3 className="text-xl font-semibold mb-4">Battle Result</h3>
          <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-400">
            <p className="text-blue-300">{battleResult}</p>
          </div>
        </div>
      )}

      {/* Quick Match */}
      <div className="glass-panel p-6">
        <h3 className="text-xl font-semibold mb-4">Quick Match</h3>
        <p className="text-gray-400 mb-4">
          Find random opponents for quick battles. Coming soon!
        </p>
        <button
          disabled
          className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Find Match (Coming Soon)
        </button>
      </div>

      {/* Leaderboard Preview */}
      <div className="glass-panel p-6">
        <h3 className="text-xl font-semibold mb-4">Top Players</h3>
        
        <div className="space-y-3">
          {[
            { rank: 1, address: '0x1234...5678', wins: 45, winRate: 78 },
            { rank: 2, address: '0x2345...6789', wins: 38, winRate: 72 },
            { rank: 3, address: '0x3456...7890', wins: 32, winRate: 69 },
          ].map((player) => (
            <div
              key={player.rank}
              className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  player.rank === 1 ? 'bg-yellow-500 text-black' :
                  player.rank === 2 ? 'bg-gray-400 text-black' :
                  'bg-orange-600 text-white'
                }`}>
                  {player.rank}
                </div>
                <div className="font-mono text-sm">{player.address}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">
                  {player.wins} wins • {player.winRate}% rate
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
