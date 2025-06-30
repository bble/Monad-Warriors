const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Verifying deployed contracts...");

  const addresses = {
    mwar: "0xD2f5d0418577BBCC98aAc97807e433dd091C1Be8",
    hero: "0xcD7Cd65d4bE940280B752e10C3eEb6D6cF53B18D",
    game: "0xecde73957F1c15cE2E225fA4F485ABE03fcC7E48"
  };

  try {
    const [deployer] = await ethers.getSigners();
    console.log("👤 Verifying with account:", deployer.address);

  try {
    // 验证MWAR Token
    console.log("\n🪙 Verifying MWAR Token...");
    const mwar = await ethers.getContractAt("MWARToken", addresses.mwar);
    
    const name = await mwar.name();
    const symbol = await mwar.symbol();
    const totalSupply = await mwar.totalSupply();
    const deployerBalance = await mwar.balanceOf(deployer.address);
    
    console.log("✅ Name:", name);
    console.log("✅ Symbol:", symbol);
    console.log("✅ Total Supply:", ethers.formatEther(totalSupply), "MWAR");
    console.log("✅ Your Balance:", ethers.formatEther(deployerBalance), "MWAR");

    // 验证Hero NFT
    console.log("\n⚔️ Verifying Hero NFT...");
    const hero = await ethers.getContractAt("HeroNFT", addresses.hero);
    
    const heroName = await hero.name();
    const heroSymbol = await hero.symbol();
    const heroBalance = await hero.balanceOf(deployer.address);
    
    console.log("✅ Name:", heroName);
    console.log("✅ Symbol:", heroSymbol);
    console.log("✅ Your Heroes:", heroBalance.toString());

    // 检查铸造成本
    const commonCost = await hero.mintCosts(0); // Common
    const rareCost = await hero.mintCosts(1);   // Rare
    const epicCost = await hero.mintCosts(2);   // Epic
    const legendaryCost = await hero.mintCosts(3); // Legendary
    
    console.log("💰 Mint Costs:");
    console.log("   Common:", ethers.formatEther(commonCost), "MWAR");
    console.log("   Rare:", ethers.formatEther(rareCost), "MWAR");
    console.log("   Epic:", ethers.formatEther(epicCost), "MWAR");
    console.log("   Legendary:", ethers.formatEther(legendaryCost), "MWAR");

    // 验证Game Core
    console.log("\n🎮 Verifying Game Core...");
    const game = await ethers.getContractAt("GameCore", addresses.game);
    
    const baseReward = await game.baseWinReward();
    const dailyLimit = await game.DAILY_REWARD_LIMIT();
    const cooldown = await game.BATTLE_COOLDOWN();
    
    console.log("✅ Base Win Reward:", ethers.formatEther(baseReward), "MWAR");
    console.log("✅ Daily Reward Limit:", ethers.formatEther(dailyLimit), "MWAR");
    console.log("✅ Battle Cooldown:", cooldown.toString(), "seconds");

    // 检查玩家统计
    const playerStats = await game.playerStats(deployer.address);
    console.log("📊 Your Stats:");
    console.log("   Total Battles:", playerStats.totalBattles.toString());
    console.log("   Wins:", playerStats.wins.toString());
    console.log("   Losses:", playerStats.losses.toString());

    // 验证权限设置
    console.log("\n🔐 Verifying Permissions...");
    const isGameContract = await mwar.gameContracts(addresses.game);
    console.log("✅ GameCore is authorized:", isGameContract);

    console.log("\n🎉 All contracts verified successfully!");
    console.log("\n🚀 Ready to play! Run: npm run dev");

  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    console.error("Full error:", error);
  }
}

main().catch(console.error);
