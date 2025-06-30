const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking MWAR Token Balances");
  console.log("================================");

  // 获取合约实例
  const mwarToken = await ethers.getContractAt("MWARToken", "0xD2f5d0418577BBCC98aAc97807e433dd091C1Be8");
  
  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deployer account:", deployer.address);
  
  // 获取各个钱包地址
  const gameRewardsPool = await mwarToken.gameRewardsPool();
  const teamWallet = await mwarToken.teamWallet();
  const investorWallet = await mwarToken.investorWallet();
  const communityWallet = await mwarToken.communityWallet();
  const ecosystemWallet = await mwarToken.ecosystemWallet();
  
  console.log("\n📊 Wallet Addresses:");
  console.log("Game Rewards Pool:", gameRewardsPool);
  console.log("Team Wallet:", teamWallet);
  console.log("Investor Wallet:", investorWallet);
  console.log("Community Wallet:", communityWallet);
  console.log("Ecosystem Wallet:", ecosystemWallet);
  
  console.log("\n💰 Token Balances:");
  
  // 检查各个钱包的余额
  const balances = {
    "Deployer": await mwarToken.balanceOf(deployer.address),
    "Game Rewards Pool": await mwarToken.balanceOf(gameRewardsPool),
    "Team Wallet": await mwarToken.balanceOf(teamWallet),
    "Investor Wallet": await mwarToken.balanceOf(investorWallet),
    "Community Wallet": await mwarToken.balanceOf(communityWallet),
    "Ecosystem Wallet": await mwarToken.balanceOf(ecosystemWallet)
  };
  
  for (const [name, balance] of Object.entries(balances)) {
    console.log(`${name}: ${ethers.formatEther(balance)} MWAR`);
  }
  
  // 检查总供应量
  const totalSupply = await mwarToken.totalSupply();
  console.log(`\n🎯 Total Supply: ${ethers.formatEther(totalSupply)} MWAR`);
  
  // 找出有代币的钱包
  console.log("\n💎 Wallets with tokens:");
  for (const [name, balance] of Object.entries(balances)) {
    if (balance > 0) {
      console.log(`✅ ${name}: ${ethers.formatEther(balance)} MWAR`);
    }
  }
  
  // 检查合约所有者
  const owner = await mwarToken.owner();
  console.log(`\n👑 Contract Owner: ${owner}`);
  console.log(`🔑 Is deployer the owner? ${owner.toLowerCase() === deployer.address.toLowerCase()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
