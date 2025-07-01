const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking deployed contract functions...");

  // 新部署的合约地址
  const GAME_CORE_ADDRESS = "0x5447b32f99A65e5Be2ca278d53dAb9daB54036Aa";

  try {
    // 连接到合约
    const GameCore = await ethers.getContractFactory("GameCore");
    const gameCore = GameCore.attach(GAME_CORE_ADDRESS);

    console.log("📋 Contract Address:", GAME_CORE_ADDRESS);

    // 检查是否有submitBattleResult函数
    try {
      // 尝试调用函数（不会实际执行，只是检查函数是否存在）
      const functionFragment = gameCore.interface.getFunction("submitBattleResult");
      console.log("✅ submitBattleResult function exists");
      console.log("📝 Function signature:", functionFragment.format());
    } catch (error) {
      console.log("❌ submitBattleResult function does not exist");
      console.log("💡 Need to redeploy contract with new function");
    }

    // 检查其他重要函数
    const functionsToCheck = [
      "startPvPBattle",
      "playerStats", 
      "baseWinReward",
      "baseLoseReward",
      "drawReward"
    ];

    console.log("\n🔍 Checking other functions:");
    for (const funcName of functionsToCheck) {
      try {
        const functionFragment = gameCore.interface.getFunction(funcName);
        console.log(`✅ ${funcName} exists`);
      } catch (error) {
        console.log(`❌ ${funcName} does not exist`);
      }
    }

    // 检查奖励配置
    try {
      const baseWinReward = await gameCore.baseWinReward();
      const baseLoseReward = await gameCore.baseLoseReward();
      const drawReward = await gameCore.drawReward();
      
      console.log("\n🎁 Current Reward Configuration:");
      console.log("  Win Reward:", ethers.formatEther(baseWinReward), "MWAR");
      console.log("  Lose Reward:", ethers.formatEther(baseLoseReward), "MWAR");
      console.log("  Draw Reward:", ethers.formatEther(drawReward), "MWAR");
    } catch (error) {
      console.log("❌ Could not read reward configuration:", error.message);
    }

  } catch (error) {
    console.error("❌ Error checking contract:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
