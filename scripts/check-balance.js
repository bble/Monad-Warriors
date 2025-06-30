const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking account balance...");
  
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  
  console.log("👤 Account:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "MON");
  
  const requiredBalance = ethers.parseEther("0.1");
  
  if (balance < requiredBalance) {
    console.log("\n⚠️  Warning: Low balance detected!");
    console.log("💡 You need at least 0.1 MON for deployment");
    console.log("🚰 Visit Monad testnet faucet to get test tokens");
    console.log("🔗 Faucet: https://testnet-faucet.monad.xyz (check Monad docs for actual faucet URL)");
    return false;
  } else {
    console.log("\n✅ Sufficient balance for deployment");
    console.log("🚀 Ready to deploy contracts!");
    return true;
  }
}

if (require.main === module) {
  main()
    .then((ready) => {
      if (ready) {
        console.log("\n📋 Next step: npm run deploy:testnet");
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error checking balance:", error);
      process.exit(1);
    });
}

module.exports = main;
