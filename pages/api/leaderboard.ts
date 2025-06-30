import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, GAME_CORE_ABI } from '@/utils/contractABI';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { category = 'rank', timeFilter = 'all' } = req.body;

    // 连接到Monad testnet
    const provider = new ethers.JsonRpcProvider(
      process.env.MONAD_TESTNET_RPC_URL || 'https://testnet-rpc.monad.xyz'
    );

    // 创建合约实例
    const gameContract = new ethers.Contract(
      CONTRACT_ADDRESSES.GAME_CORE,
      GAME_CORE_ABI,
      provider
    );

    try {
      // 获取排行榜数据
      const leaderboard = await gameContract.getLeaderboard();
      
      // 转换为前端需要的格式
      const leaderboardData = await Promise.all(
        leaderboard.map(async (playerAddress: string, index: number) => {
          try {
            // 获取玩家统计
            const stats = await gameContract.playerStats(playerAddress);
            
            // 计算胜率
            const totalBattles = Number(stats[0]);
            const wins = Number(stats[1]);
            const winRate = totalBattles > 0 ? (wins / totalBattles) * 100 : 0;
            
            return {
              rank: index + 1,
              address: playerAddress,
              displayName: `Player ${index + 1}`,
              totalBattles: totalBattles,
              wins: wins,
              losses: Number(stats[2]),
              winRate: Math.round(winRate * 10) / 10,
              totalRewards: Number(ethers.formatEther(stats[4])),
              maxWinStreak: Number(stats[7]),
              favoriteHero: { class: 0, rarity: 0, level: 1 }, // 默认值
              lastActive: 'Unknown'
            };
          } catch (error) {
            // 如果获取单个玩家数据失败，返回默认值
            return {
              rank: index + 1,
              address: playerAddress,
              displayName: `Player ${index + 1}`,
              totalBattles: 0,
              wins: 0,
              losses: 0,
              winRate: 0,
              totalRewards: 0,
              maxWinStreak: 0,
              favoriteHero: { class: 0, rarity: 0, level: 1 },
              lastActive: 'Unknown'
            };
          }
        })
      );

      // 根据类别排序
      let sortedData = [...leaderboardData];
      switch (category) {
        case 'wins':
          sortedData.sort((a, b) => b.wins - a.wins);
          break;
        case 'winRate':
          sortedData.sort((a, b) => b.winRate - a.winRate);
          break;
        case 'rewards':
          sortedData.sort((a, b) => b.totalRewards - a.totalRewards);
          break;
        case 'streak':
          sortedData.sort((a, b) => b.maxWinStreak - a.maxWinStreak);
          break;
        default:
          // 默认按排名排序（已经是正确顺序）
          break;
      }

      // 重新分配排名
      sortedData = sortedData.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

      return res.status(200).json({
        leaderboard: sortedData,
        category,
        timeFilter
      });

    } catch (contractError) {
      // 如果合约调用失败，返回空排行榜
      return res.status(200).json({
        leaderboard: [],
        category,
        timeFilter
      });
    }

  } catch (error) {
    console.error('Leaderboard API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
