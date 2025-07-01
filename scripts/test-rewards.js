const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing battle reward system...");

  // 新部署的合约地址
  const MWAR_TOKEN_ADDRESS = "0x2746231982d7Ba755afbeDF70b102DfD92a886C5";
  const GAME_CORE_ADDRESS = "0x5447b32f99A65e5Be2ca278d53dAb9daB54036Aa";

  try {
    // 获取当前账户
    const [deployer] = await ethers.getSigners();
    console.log("📋 Testing with account:", deployer.address);

    // 连接到合约
    const MWARToken = await ethers.getContractFactory("MWARToken");
    const GameCore = await ethers.getContractFactory("GameCore");
    
    const mwarToken = MWARToken.attach(MWAR_TOKEN_ADDRESS);
    const gameCore = GameCore.attach(GAME_CORE_ADDRESS);

    // 检查初始MWAR余额
    const initialBalance = await mwarToken.balanceOf(deployer.address);
    console.log("💰 Initial MWAR balance:", ethers.formatEther(initialBalance), "MWAR");

    // 检查奖励配置
    const baseWinReward = await gameCore.baseWinReward();
    const baseLoseReward = await gameCore.baseLoseReward();
    const drawReward = await gameCore.drawReward();
    
    console.log("\n🎁 Reward Configuration:");
    console.log("  Win Reward:", ethers.formatEther(baseWinReward), "MWAR");
    console.log("  Lose Reward:", ethers.formatEther(baseLoseReward), "MWAR");
    console.log("  Draw Reward:", ethers.formatEther(drawReward), "MWAR");

    // 检查每日奖励状态
    const dailyRewards = await gameCore.dailyRewards(deployer.address);
    const dailyLimit = await gameCore.DAILY_REWARD_LIMIT();
    console.log("\n📅 Daily Rewards Status:");
    console.log("  Today's Rewards:", ethers.formatEther(dailyRewards), "MWAR");
    console.log("  Daily Limit:", ethers.formatEther(dailyLimit), "MWAR");

    // 检查玩家统计
    const playerStats = await gameCore.playerStats(deployer.address);
    console.log("\n📊 Player Statistics:");
    console.log("  Total Battles:", playerStats.totalBattles.toString());
    console.log("  Wins:", playerStats.wins.toString());
    console.log("  Losses:", playerStats.losses.toString());
    console.log("  Draws:", playerStats.draws.toString());
    console.log("  Total Rewards:", ethers.formatEther(playerStats.totalRewards), "MWAR");

    console.log("\n✅ Reward system is ready for testing!");
    console.log("\n💡 To test rewards:");
    console.log("   1. Complete a battle in the game");
    console.log("   2. Check if MWAR balance increases");
    console.log("   3. Verify player statistics are updated");

  } catch (error) {
    console.error("❌ Error testing rewards:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
