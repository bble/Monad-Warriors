const { ethers } = require('ethers');

async function fixLeaderboard() {
  try {
    console.log('🔧 修复排行榜数据...');
    
    const provider = new ethers.JsonRpcProvider('https://testnet-rpc.monad.xyz');
    const GAME_CORE_ADDRESS = '0x935e44C9fAc29E17AcE3E5AB047D8027E6E1A101';
    
    const GAME_CORE_ABI = [
      'function getRecentBattles(uint256) view returns (tuple(address,address,uint256,uint256,uint8,uint256,uint256)[])',
      'function playerStats(address) view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256)',
      'function getLeaderboard() view returns (address[])'
    ];
    
    const contract = new ethers.Contract(GAME_CORE_ADDRESS, GAME_CORE_ABI, provider);
    
    // 1. 获取所有战斗记录
    console.log('📊 获取战斗记录...');
    const battles = await contract.getRecentBattles(100); // 获取最近100场战斗
    console.log(`找到 ${battles.length} 场战斗`);
    
    // 2. 提取所有参与过战斗的玩家
    const players = new Set();
    battles.forEach(battle => {
      players.add(battle[0]); // player1
      players.add(battle[1]); // player2
    });
    
    console.log(`\\n👥 发现 ${players.size} 个玩家:`);
    
    // 3. 检查每个玩家的统计数据
    const playerData = [];
    for (const player of players) {
      try {
        const stats = await contract.playerStats(player);
        const totalBattles = Number(stats[0]);
        const wins = Number(stats[1]);
        const losses = Number(stats[2]);
        const draws = Number(stats[3]);
        const totalRewards = ethers.formatEther(stats[4]);
        const winRate = totalBattles > 0 ? (wins / totalBattles * 100) : 0;
        
        playerData.push({
          address: player,
          totalBattles,
          wins,
          losses,
          draws,
          totalRewards,
          winRate
        });
        
        console.log(`${player}: ${totalBattles}场战斗, 胜率${winRate.toFixed(1)}%`);
      } catch (error) {
        console.log(`❌ 无法读取 ${player} 的数据:`, error.message);
      }
    }
    
    // 4. 检查当前排行榜
    console.log('\\n🏆 当前排行榜:');
    const leaderboard = await contract.getLeaderboard();
    console.log(`排行榜玩家数: ${leaderboard.length}`);
    
    if (leaderboard.length === 0) {
      console.log('\\n❌ 排行榜为空的原因分析:');
      console.log('1. 合约要求至少10场战斗才能上榜（已修改为1场）');
      console.log('2. 需要重新部署合约或手动触发排行榜更新');
      console.log('3. 或者进行更多战斗来触发排行榜更新');
    }
    
    // 5. 显示应该在排行榜上的玩家
    console.log('\\n📋 应该在排行榜上的玩家:');
    const eligiblePlayers = playerData.filter(p => p.totalBattles >= 1);
    eligiblePlayers.sort((a, b) => b.winRate - a.winRate);
    
    eligiblePlayers.forEach((player, i) => {
      console.log(`${i + 1}. ${player.address.slice(0, 6)}...${player.address.slice(-4)} - ${player.winRate.toFixed(1)}% (${player.wins}W/${player.losses}L/${player.draws}D)`);
    });
    
    console.log('\\n💡 解决方案:');
    console.log('1. 重新部署合约（推荐）');
    console.log('2. 或者进行更多战斗来触发排行榜更新');
    console.log('3. 使用前端的"玩家数据查看器"查看实际数据');
    
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
  }
}

fixLeaderboard();
