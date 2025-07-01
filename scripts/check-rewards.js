const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking current reward system...");

  // 获取合约地址
  const MWAR_TOKEN_ADDRESS = "0x1234567890123456789012345678901234567890"; // 替换为实际地址
  const GAME_CORE_ADDRESS = "0x1234567890123456789012345678901234567890"; // 替换为实际地址

  try {
    // 连接到合约
    const MWARToken = await ethers.getContractFactory("MWARToken");
    const GameCore = await ethers.getContractFactory("GameCore");
    
    const mwarToken = MWARToken.attach(MWAR_TOKEN_ADDRESS);
    const gameCore = GameCore.attach(GAME_CORE_ADDRESS);

    // 获取当前账户
    const [deployer] = await ethers.getSigners();
    console.log("📋 Checking account:", deployer.address);

    // 检查MWAR余额
    const balance = await mwarToken.balanceOf(deployer.address);
    console.log("💰 Current MWAR balance:", ethers.formatEther(balance), "MWAR");

    // 检查奖励配置
    const baseWinReward = await gameCore.baseWinReward();
    const baseLoseReward = await gameCore.baseLoseReward();
    const drawReward = await gameCore.drawReward();
    
    console.log("🎁 Reward Configuration:");
    console.log("  Win Reward:", ethers.formatEther(baseWinReward), "MWAR");
    console.log("  Lose Reward:", ethers.formatEther(baseLoseReward), "MWAR");
    console.log("  Draw Reward:", ethers.formatEther(drawReward), "MWAR");

    // 检查玩家统计
    const playerStats = await gameCore.playerStats(deployer.address);
    console.log("📊 Player Statistics:");
    console.log("  Total Battles:", playerStats.totalBattles.toString());
    console.log("  Wins:", playerStats.wins.toString());
    console.log("  Losses:", playerStats.losses.toString());
    console.log("  Draws:", playerStats.draws.toString());
    console.log("  Total Rewards:", ethers.formatEther(playerStats.totalRewards), "MWAR");

    // 检查每日奖励限制
    const dailyRewards = await gameCore.dailyRewards(deployer.address);
    const dailyLimit = await gameCore.DAILY_REWARD_LIMIT();
    console.log("📅 Daily Rewards:");
    console.log("  Today's Rewards:", ethers.formatEther(dailyRewards), "MWAR");
    console.log("  Daily Limit:", ethers.formatEther(dailyLimit), "MWAR");

  } catch (error) {
    console.error("❌ Error checking rewards:", error.message);
    console.log("💡 This might be because the contracts haven't been deployed yet or addresses are incorrect.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
