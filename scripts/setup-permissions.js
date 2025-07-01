const { ethers } = require("hardhat");

async function main() {
  console.log("🔐 Setting up contract permissions...");

  // 已部署的合约地址
  const MWAR_TOKEN_ADDRESS = "0x2746231982d7Ba755afbeDF70b102DfD92a886C5";
  const HERO_NFT_ADDRESS = "0x18F96e349DfDcdF03AEaa89fd4a0BE2C78B40bf4";
  const GAME_CORE_ADDRESS = "0x5447b32f99A65e5Be2ca278d53dAb9daB54036Aa";

  try {
    // 获取当前网络的gas价格并设置合理的费用
    console.log("\n⛽ Getting current gas prices...");
    const feeData = await ethers.provider.getFeeData();
    console.log("Current gas price:", ethers.formatUnits(feeData.gasPrice || 0, "gwei"), "gwei");
    
    // 设置gas选项 - 比当前价格高100%以确保被包含
    const gasPrice = feeData.gasPrice ? feeData.gasPrice * BigInt(200) / BigInt(100) : ethers.parseUnits("100", "gwei");
    const gasOptions = {
      gasPrice: gasPrice,
      gasLimit: 200000 // 权限设置不需要太多gas
    };
    console.log("Using gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");

    // 连接到合约
    const MWARToken = await ethers.getContractFactory("MWARToken");
    const mwarToken = MWARToken.attach(MWAR_TOKEN_ADDRESS);

    // 设置权限
    console.log("\n🔐 Adding Game Core as authorized contract...");
    const tx1 = await mwarToken.addGameContract(GAME_CORE_ADDRESS, gasOptions);
    await tx1.wait();
    console.log("✅ Game Core added as authorized contract");

    // 验证权限
    console.log("\n🔍 Verifying permissions...");
    const isAuthorized = await mwarToken.gameContracts(GAME_CORE_ADDRESS);
    console.log("Game Core authorized:", isAuthorized);

    console.log("\n✅ Permissions setup completed!");
    console.log("\n📋 Contract Addresses:");
    console.log("MWAR Token:", MWAR_TOKEN_ADDRESS);
    console.log("Hero NFT:", HERO_NFT_ADDRESS);
    console.log("Game Core:", GAME_CORE_ADDRESS);

  } catch (error) {
    console.error("❌ Error setting up permissions:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
