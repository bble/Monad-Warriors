const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 检查Monad Testnet Gas价格...\n");

  try {
    // 直接使用ethers.provider
    const provider = ethers.provider;

    // 获取当前gas价格
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || BigInt("1000000000"); // 1 gwei fallback
    const gasPriceGwei = ethers.formatUnits(gasPrice, "gwei");
    
    console.log("📊 当前网络状态:");
    console.log(`Gas Price: ${gasPrice.toString()} wei`);
    console.log(`Gas Price: ${gasPriceGwei} gwei`);
    
    // 获取最新区块信息
    const latestBlock = await provider.getBlock("latest");
    console.log(`\n📦 最新区块:`);
    console.log(`Block Number: ${latestBlock.number}`);
    console.log(`Gas Used: ${latestBlock.gasUsed.toString()}`);
    console.log(`Gas Limit: ${latestBlock.gasLimit.toString()}`);
    console.log(`Base Fee: ${latestBlock.baseFeePerGas ? ethers.formatUnits(latestBlock.baseFeePerGas, "gwei") + " gwei" : "N/A"}`);
    
    // 估算简单转账的gas费用
    const simpleTransferGas = 21000;
    const transferCost = gasPrice * BigInt(simpleTransferGas);
    const transferCostEth = ethers.formatEther(transferCost);
    
    console.log(`\n💰 Gas费用估算:`);
    console.log(`简单转账 (21,000 gas): ${transferCostEth} MON`);
    
    // 估算合约交互的gas费用
    const contractInteractionGas = 200000; // 典型的合约交互
    const contractCost = gasPrice * BigInt(contractInteractionGas);
    const contractCostEth = ethers.formatEther(contractCost);
    
    console.log(`合约交互 (200,000 gas): ${contractCostEth} MON`);
    
    // 估算NFT铸造的gas费用
    const nftMintGas = 500000; // NFT铸造通常需要更多gas
    const nftCost = gasPrice * BigInt(nftMintGas);
    const nftCostEth = ethers.formatEther(nftCost);
    
    console.log(`NFT铸造 (500,000 gas): ${nftCostEth} MON`);
    
    // 建议的gas价格
    const suggestedGasPrice = gasPrice / BigInt(2); // 建议使用一半的当前价格
    const suggestedGasPriceGwei = ethers.formatUnits(suggestedGasPrice, "gwei");
    
    console.log(`\n💡 建议设置:`);
    console.log(`建议Gas Price: ${suggestedGasPriceGwei} gwei`);
    console.log(`建议Gas Price: ${suggestedGasPrice.toString()} wei`);
    
  } catch (error) {
    console.error("❌ 检查gas价格时出错:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
