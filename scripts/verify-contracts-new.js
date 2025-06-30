const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🔍 Starting comprehensive contract verification...");
  
  // 合约地址
  const addresses = {
    mwar: "0xa200561a8e6325fD24AE767c1701F2d1Aa3860e1",
    hero: "0x01Eb7582f8cf98EeB5bd7F0aCfC8DACCeeD18F96",
    game: "0x935e44C9fAc29E17AcE3E5AB047D8027E6E1A101"
  };

  const [deployer] = await ethers.getSigners();
  console.log("👤 Verifying with account:", deployer.address);
  
  const verificationResults = {
    mwarToken: { passed: 0, failed: 0, tests: [] },
    heroNFT: { passed: 0, failed: 0, tests: [] },
    gameCore: { passed: 0, failed: 0, tests: [] }
  };
  
  try {
    // 获取合约实例
    const mwar = await ethers.getContractAt("MWARToken", addresses.mwar);
    const hero = await ethers.getContractAt("HeroNFT", addresses.hero);
    const game = await ethers.getContractAt("GameCore", addresses.game);
    
    // 验证 MWAR Token
    console.log("\n🪙 Verifying MWAR Token...");
    
    // 测试1: 基本信息
    try {
      const name = await mwar.name();
      const symbol = await mwar.symbol();
      const totalSupply = await mwar.totalSupply();
      
      console.log("   ✅ Name:", name);
      console.log("   ✅ Symbol:", symbol);
      console.log("   ✅ Total Supply:", ethers.formatEther(totalSupply), "MWAR");
      verificationResults.mwarToken.passed++;
      verificationResults.mwarToken.tests.push("Basic Info");
    } catch (error) {
      console.log("   ❌ Basic info check failed:", error.message);
      verificationResults.mwarToken.failed++;
    }
    
    // 测试2: 水龙头功能
    try {
      const canClaim = await mwar.canClaimFromFaucet(deployer.address);
      const faucetAmount = await mwar.FAUCET_AMOUNT();
      console.log("   ✅ Faucet amount:", ethers.formatEther(faucetAmount), "MWAR");
      console.log("   ✅ Can claim:", canClaim);
      verificationResults.mwarToken.passed++;
      verificationResults.mwarToken.tests.push("Faucet Function");
    } catch (error) {
      console.log("   ❌ Faucet function check failed:", error.message);
      verificationResults.mwarToken.failed++;
    }
    
    // 测试3: 游戏合约权限
    try {
      const isGameContract = await mwar.isGameContract(addresses.game);
      console.log("   ✅ GameCore is game contract:", isGameContract);
      verificationResults.mwarToken.passed++;
      verificationResults.mwarToken.tests.push("Game Contract Permission");
    } catch (error) {
      console.log("   ❌ Game contract permission check failed:", error.message);
      verificationResults.mwarToken.failed++;
    }
    
    // 验证 Hero NFT
    console.log("\n⚔️ Verifying Hero NFT...");
    
    // 测试1: 基本信息
    try {
      const heroName = await hero.name();
      const heroSymbol = await hero.symbol();
      const heroBalance = await hero.balanceOf(deployer.address);
      
      console.log("   ✅ Name:", heroName);
      console.log("   ✅ Symbol:", heroSymbol);
      console.log("   ✅ Your Heroes:", heroBalance.toString());
      verificationResults.heroNFT.passed++;
      verificationResults.heroNFT.tests.push("Basic Info");
    } catch (error) {
      console.log("   ❌ Basic info check failed:", error.message);
      verificationResults.heroNFT.failed++;
    }
    
    // 测试2: 铸造成本
    try {
      const commonCost = await hero.mintCosts(0);
      const rareCost = await hero.mintCosts(1);
      const epicCost = await hero.mintCosts(2);
      const legendaryCost = await hero.mintCosts(3);
      
      console.log("   ✅ Mint Costs:");
      console.log("      Common:", ethers.formatEther(commonCost), "MWAR");
      console.log("      Rare:", ethers.formatEther(rareCost), "MWAR");
      console.log("      Epic:", ethers.formatEther(epicCost), "MWAR");
      console.log("      Legendary:", ethers.formatEther(legendaryCost), "MWAR");
      verificationResults.heroNFT.passed++;
      verificationResults.heroNFT.tests.push("Mint Costs");
    } catch (error) {
      console.log("   ❌ Mint costs check failed:", error.message);
      verificationResults.heroNFT.failed++;
    }
    
    // 测试3: MWAR代币地址
    try {
      const tokenAddress = await hero.mwarToken();
      if (tokenAddress.toLowerCase() === addresses.mwar.toLowerCase()) {
        console.log("   ✅ MWAR token address correct");
        verificationResults.heroNFT.passed++;
      } else {
        console.log("   ❌ MWAR token address incorrect");
        verificationResults.heroNFT.failed++;
      }
      verificationResults.heroNFT.tests.push("MWAR Token Address");
    } catch (error) {
      console.log("   ❌ MWAR token address check failed:", error.message);
      verificationResults.heroNFT.failed++;
    }
    
    // 验证 Game Core
    console.log("\n🎮 Verifying Game Core...");
    
    // 测试1: 合约地址
    try {
      const mwarAddress = await game.mwarToken();
      const heroAddress = await game.heroNFT();
      
      if (mwarAddress.toLowerCase() === addresses.mwar.toLowerCase() &&
          heroAddress.toLowerCase() === addresses.hero.toLowerCase()) {
        console.log("   ✅ Contract addresses correct");
        verificationResults.gameCore.passed++;
      } else {
        console.log("   ❌ Contract addresses incorrect");
        verificationResults.gameCore.failed++;
      }
      verificationResults.gameCore.tests.push("Contract Addresses");
    } catch (error) {
      console.log("   ❌ Contract addresses check failed:", error.message);
      verificationResults.gameCore.failed++;
    }
    
    // 测试2: 奖励配置
    try {
      const baseWinReward = await game.baseWinReward();
      const baseLoseReward = await game.baseLoseReward();
      const drawReward = await game.drawReward();
      
      console.log("   ✅ Reward configuration:");
      console.log("      Win reward:", ethers.formatEther(baseWinReward), "MWAR");
      console.log("      Lose reward:", ethers.formatEther(baseLoseReward), "MWAR");
      console.log("      Draw reward:", ethers.formatEther(drawReward), "MWAR");
      verificationResults.gameCore.passed++;
      verificationResults.gameCore.tests.push("Reward Configuration");
    } catch (error) {
      console.log("   ❌ Reward configuration check failed:", error.message);
      verificationResults.gameCore.failed++;
    }
    
    // 测试3: 游戏常量
    try {
      const dailyLimit = await game.DAILY_REWARD_LIMIT();
      const cooldown = await game.BATTLE_COOLDOWN();
      const leaderboardSize = await game.LEADERBOARD_SIZE();
      
      console.log("   ✅ Game constants:");
      console.log("      Daily limit:", ethers.formatEther(dailyLimit), "MWAR");
      console.log("      Battle cooldown:", cooldown.toString(), "seconds");
      console.log("      Leaderboard size:", leaderboardSize.toString());
      verificationResults.gameCore.passed++;
      verificationResults.gameCore.tests.push("Game Constants");
    } catch (error) {
      console.log("   ❌ Game constants check failed:", error.message);
      verificationResults.gameCore.failed++;
    }
    
    // 生成验证报告
    console.log("\n📊 Verification Report");
    console.log("=" .repeat(50));
    
    const totalPassed = verificationResults.mwarToken.passed + 
                       verificationResults.heroNFT.passed + 
                       verificationResults.gameCore.passed;
    const totalFailed = verificationResults.mwarToken.failed + 
                       verificationResults.heroNFT.failed + 
                       verificationResults.gameCore.failed;
    const totalTests = totalPassed + totalFailed;
    
    console.log(`📈 Overall: ${totalPassed}/${totalTests} tests passed (${((totalPassed/totalTests)*100).toFixed(1)}%)`);
    console.log("");
    
    Object.entries(verificationResults).forEach(([contract, results]) => {
      const total = results.passed + results.failed;
      const percentage = total > 0 ? ((results.passed/total)*100).toFixed(1) : 0;
      console.log(`${contract}: ${results.passed}/${total} passed (${percentage}%)`);
      results.tests.forEach((test, index) => {
        const status = index < results.passed ? "✅" : "❌";
        console.log(`   ${status} ${test}`);
      });
    });
    
    // 功能测试建议
    console.log("\n💡 Recommended Tests:");
    console.log("   1. Test faucet claim: npx hardhat run scripts/test-faucet.js --network monadTestnet");
    console.log("   2. Test hero minting: Try minting a hero through the frontend");
    console.log("   3. Test battle system: Create a battle between heroes");
    console.log("   4. Check frontend integration: Verify all data displays correctly");
    
    if (totalFailed === 0) {
      console.log("\n🎉 All verifications passed! Contracts are ready for use.");
    } else {
      console.log(`\n⚠️  ${totalFailed} verification(s) failed. Please review and fix issues.`);
    }
    
  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
