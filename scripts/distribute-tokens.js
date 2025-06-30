const { ethers } = require("hardhat");

async function main() {
  console.log("🚰 Starting token distribution for testing...");

  // 获取合约实例
  const mwarToken = await ethers.getContractAt("MWARToken", "0xD2f5d0418577BBCC98aAc97807e433dd091C1Be8");
  
  // 获取游戏奖励池地址
  const gameRewardsPool = await mwarToken.gameRewardsPool();
  console.log("Game Rewards Pool:", gameRewardsPool);
  
  // 检查游戏奖励池余额
  const poolBalance = await mwarToken.balanceOf(gameRewardsPool);
  console.log("Pool Balance:", ethers.formatEther(poolBalance), "MWAR");
  
  // 测试地址列表 (你可以添加更多测试地址)
  const testAddresses = [
    "0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5A", // 示例地址，请替换为实际测试地址
    // 添加更多测试地址...
  ];
  
  // 每个地址分发的代币数量 (10000 MWAR)
  const amountPerAddress = ethers.parseEther("10000");
  
  console.log(`\n📤 Distributing ${ethers.formatEther(amountPerAddress)} MWAR to each test address...`);
  
  for (const address of testAddresses) {
    try {
      console.log(`\n🎯 Sending tokens to: ${address}`);
      
      // 从游戏奖励池转账到测试地址
      const tx = await mwarToken.transfer(address, amountPerAddress);
      console.log("Transaction hash:", tx.hash);
      
      // 等待交易确认
      await tx.wait();
      console.log("✅ Transfer confirmed!");
      
      // 检查余额
      const balance = await mwarToken.balanceOf(address);
      console.log(`💰 New balance: ${ethers.formatEther(balance)} MWAR`);
      
    } catch (error) {
      console.error(`❌ Failed to send tokens to ${address}:`, error.message);
    }
  }
  
  console.log("\n🎉 Token distribution completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
