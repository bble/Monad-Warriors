const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking current gas prices on Monad testnet...");

  try {
    // 获取provider
    const provider = ethers.provider;
    
    // 获取当前gas价格
    const gasPrice = await provider.getGasPrice();
    console.log("⛽ Current gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
    
    // 建议的gas价格 (比当前价格高20%)
    const suggestedGasPrice = gasPrice * BigInt(120) / BigInt(100);
    console.log("💡 Suggested gas price:", ethers.formatUnits(suggestedGasPrice, "gwei"), "gwei");
    
    // 获取最新区块信息
    const latestBlock = await provider.getBlock("latest");
    if (latestBlock) {
      console.log("📦 Latest block:");
      console.log("  Block number:", latestBlock.number);
      console.log("  Gas used:", latestBlock.gasUsed.toString());
      console.log("  Gas limit:", latestBlock.gasLimit.toString());
      if (latestBlock.baseFeePerGas) {
        console.log("  Base fee:", ethers.formatUnits(latestBlock.baseFeePerGas, "gwei"), "gwei");
      }
    }

  } catch (error) {
    console.error("❌ Error checking gas prices:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
