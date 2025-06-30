const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking MWAR token balance...");

  const mwarAddress = "0xD2f5d0418577BBCC98aAc97807e433dd091C1Be8";
  const deployerAddress = "0xDB7E64447b7F537712dcA18516F11fF91b58ea5a";

  try {
    // 连接到MWAR合约
    const mwar = await ethers.getContractAt("MWARToken", mwarAddress);
    
    console.log("📋 Contract Info:");
    console.log("MWAR Address:", mwarAddress);
    console.log("Your Address:", deployerAddress);
    
    // 检查基本信息
    const name = await mwar.name();
    const symbol = await mwar.symbol();
    const totalSupply = await mwar.totalSupply();
    
    console.log("\n🪙 Token Info:");
    console.log("Name:", name);
    console.log("Symbol:", symbol);
    console.log("Total Supply:", ethers.formatEther(totalSupply), "MWAR");
    
    // 检查你的余额
    const yourBalance = await mwar.balanceOf(deployerAddress);
    console.log("\n💰 Your Balance:");
    console.log("Raw Balance:", yourBalance.toString());
    console.log("Formatted Balance:", ethers.formatEther(yourBalance), "MWAR");
    
    // 检查各个钱包的余额
    const gameRewardsPool = await mwar.gameRewardsPool();
    const teamWallet = await mwar.teamWallet();
    const investorWallet = await mwar.investorWallet();
    const communityWallet = await mwar.communityWallet();
    const ecosystemWallet = await mwar.ecosystemWallet();
    
    console.log("\n📊 Wallet Addresses:");
    console.log("Game Rewards Pool:", gameRewardsPool);
    console.log("Team Wallet:", teamWallet);
    console.log("Investor Wallet:", investorWallet);
    console.log("Community Wallet:", communityWallet);
    console.log("Ecosystem Wallet:", ecosystemWallet);
    
    // 检查各个钱包的余额
    const gameBalance = await mwar.balanceOf(gameRewardsPool);
    const teamBalance = await mwar.balanceOf(teamWallet);
    const investorBalance = await mwar.balanceOf(investorWallet);
    const communityBalance = await mwar.balanceOf(communityWallet);
    const ecosystemBalance = await mwar.balanceOf(ecosystemWallet);
    
    console.log("\n💰 Wallet Balances:");
    console.log("Game Rewards Pool:", ethers.formatEther(gameBalance), "MWAR");
    console.log("Team Wallet:", ethers.formatEther(teamBalance), "MWAR");
    console.log("Investor Wallet:", ethers.formatEther(investorBalance), "MWAR");
    console.log("Community Wallet:", ethers.formatEther(communityBalance), "MWAR");
    console.log("Ecosystem Wallet:", ethers.formatEther(ecosystemBalance), "MWAR");
    
    // 计算总计
    const totalAllocated = gameBalance + teamBalance + investorBalance + communityBalance + ecosystemBalance;
    console.log("\n📈 Summary:");
    console.log("Total Allocated:", ethers.formatEther(totalAllocated), "MWAR");
    console.log("Expected Total:", ethers.formatEther(totalSupply), "MWAR");
    
    // 检查是否所有钱包都是你的地址
    const allSameAddress = 
      gameRewardsPool === deployerAddress &&
      teamWallet === deployerAddress &&
      investorWallet === deployerAddress &&
      communityWallet === deployerAddress &&
      ecosystemWallet === deployerAddress;
    
    console.log("\n🔍 Address Check:");
    console.log("All wallets point to your address:", allSameAddress);
    
    if (allSameAddress) {
      console.log("✅ All tokens should be in your wallet!");
      console.log("💡 If MetaMask shows 0, try:");
      console.log("   1. Add MWAR token manually to MetaMask");
      console.log("   2. Check you're on Monad Testnet");
      console.log("   3. Refresh the page");
    } else {
      console.log("⚠️  Tokens are distributed to different addresses");
    }
    
  } catch (error) {
    console.error("❌ Error checking balance:", error.message);
  }
}

main().catch(console.error);
