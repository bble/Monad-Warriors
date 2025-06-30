const { ethers, network } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Deploying Monad Warriors contracts with smart gas pricing...");

  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  // 检查账户余额
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "MON");

  if (balance < ethers.parseEther("0.1")) {
    console.log("⚠️  Warning: Low balance. You may need more MON for deployment.");
  }

  // 获取当前网络的Gas价格
  console.log("\n⛽ Checking current gas prices...");
  let gasPrice;
  try {
    const feeData = await ethers.provider.getFeeData();
    console.log("📊 Network fee data:", {
      gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, "gwei") + " gwei" : "N/A",
      maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, "gwei") + " gwei" : "N/A",
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, "gwei") + " gwei" : "N/A"
    });

    // 使用网络建议的Gas价格，并增加50%的缓冲
    if (feeData.gasPrice) {
      gasPrice = feeData.gasPrice * BigInt(150) / BigInt(100); // 增加50%
      console.log("✅ Using gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
    } else if (feeData.maxFeePerGas) {
      gasPrice = feeData.maxFeePerGas * BigInt(120) / BigInt(100); // 增加20%
      console.log("✅ Using max fee per gas:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
    } else {
      // 回退到更高的固定价格
      gasPrice = ethers.parseUnits("100", "gwei"); // 100 gwei
      console.log("⚠️  Using fallback gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
    }
  } catch (error) {
    console.log("⚠️  Could not fetch gas price, using fallback:", error.message);
    gasPrice = ethers.parseUnits("100", "gwei"); // 100 gwei fallback
  }

  // 定义钱包地址
  const gameRewardsPool = deployer.address;
  const teamWallet = deployer.address;
  const investorWallet = deployer.address;
  const communityWallet = deployer.address;
  const ecosystemWallet = deployer.address;

  console.log("\n📋 Wallet Configuration:");
  console.log("Game Rewards Pool:", gameRewardsPool);
  console.log("Team Wallet:", teamWallet);
  console.log("Investor Wallet:", investorWallet);
  console.log("Community Wallet:", communityWallet);
  console.log("Ecosystem Wallet:", ecosystemWallet);

  let deploymentData = {
    network: network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    gasPrice: ethers.formatUnits(gasPrice, "gwei") + " gwei",
    contracts: {}
  };

  // 部署选项
  const deployOptions = {
    gasPrice: gasPrice,
    gasLimit: 5000000 // 5M gas limit
  };

  try {
    // 1. 部署MWAR Token
    console.log("\n🪙 1. Deploying MWAR Token...");
    const MWARToken = await ethers.getContractFactory("MWARToken");
    const mwarToken = await MWARToken.deploy(
      gameRewardsPool,
      teamWallet,
      investorWallet,
      communityWallet,
      ecosystemWallet,
      deployOptions
    );
    await mwarToken.waitForDeployment();
    const mwarAddress = await mwarToken.getAddress();
    console.log("✅ MWAR Token deployed to:", mwarAddress);
    deploymentData.contracts.mwarToken = mwarAddress;

    // 2. 部署Hero NFT
    console.log("\n⚔️ 2. Deploying Hero NFT...");
    const HeroNFT = await ethers.getContractFactory("HeroNFT");
    const heroNFT = await HeroNFT.deploy(mwarAddress, deployOptions);
    await heroNFT.waitForDeployment();
    const heroAddress = await heroNFT.getAddress();
    console.log("✅ Hero NFT deployed to:", heroAddress);
    deploymentData.contracts.heroNFT = heroAddress;

    // 3. 部署Game Core
    console.log("\n🎮 3. Deploying Game Core...");
    const GameCore = await ethers.getContractFactory("GameCore");
    const gameCore = await GameCore.deploy(mwarAddress, heroAddress, deployOptions);
    await gameCore.waitForDeployment();
    const gameAddress = await gameCore.getAddress();
    console.log("✅ Game Core deployed to:", gameAddress);
    deploymentData.contracts.gameCore = gameAddress;

    // 4. 配置权限
    console.log("\n🔐 4. Setting up permissions...");
    const tx1 = await mwarToken.addGameContract(gameAddress, deployOptions);
    await tx1.wait();
    console.log("✅ Game Core added as authorized contract");

    // 5. 验证部署
    console.log("\n🔍 5. Verifying deployment...");
    const totalSupply = await mwarToken.totalSupply();
    console.log("📊 MWAR Total Supply:", ethers.formatEther(totalSupply));

    const gameRewardsBalance = await mwarToken.balanceOf(gameRewardsPool);
    console.log("🎁 Game Rewards Pool Balance:", ethers.formatEther(gameRewardsBalance));

    // 6. 保存部署信息
    console.log("\n💾 6. Saving deployment data...");
    const deploymentPath = path.join(__dirname, '..', 'deployments', `${network.name}.json`);

    const deploymentsDir = path.dirname(deploymentPath);
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
    console.log("✅ Deployment data saved to:", deploymentPath);

    // 7. 更新环境变量文件
    console.log("\n📝 7. Updating environment variables...");
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    const contractVars = [
      `NEXT_PUBLIC_MWAR_TOKEN_ADDRESS=${mwarAddress}`,
      `NEXT_PUBLIC_HERO_NFT_ADDRESS=${heroAddress}`,
      `NEXT_PUBLIC_GAME_CORE_ADDRESS=${gameAddress}`
    ];

    contractVars.forEach(varLine => {
      const [key] = varLine.split('=');
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, varLine);
      } else {
        envContent += `\n${varLine}`;
      }
    });

    fs.writeFileSync(envPath, envContent);
    console.log("✅ Environment variables updated");

    // 输出部署摘要
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT SUCCESSFUL!");
    console.log("=".repeat(60));
    console.log("🌐 Network:", network.name);
    console.log("👤 Deployer:", deployer.address);
    console.log("⛽ Gas Price Used:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
    console.log("🪙 MWAR Token:", mwarAddress);
    console.log("⚔️ Hero NFT:", heroAddress);
    console.log("🎮 Game Core:", gameAddress);
    console.log("=".repeat(60));

    console.log("\n📋 Copy these to your .env file:");
    console.log(`NEXT_PUBLIC_MWAR_TOKEN_ADDRESS=${mwarAddress}`);
    console.log(`NEXT_PUBLIC_HERO_NFT_ADDRESS=${heroAddress}`);
    console.log(`NEXT_PUBLIC_GAME_CORE_ADDRESS=${gameAddress}`);

    console.log("\n🔗 Next steps:");
    console.log("1. npm run dev                 # Start the frontend");
    console.log("2. Connect your wallet to the app");
    console.log("3. Try minting a hero!");

    return {
      mwarToken: mwarAddress,
      heroNFT: heroAddress,
      gameCore: gameAddress
    };

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    
    if (error.message.includes("maxFeePerGas")) {
      console.log("\n💡 Gas price suggestions:");
      console.log("1. Try increasing gas price in hardhat.config.js");
      console.log("2. Wait for network congestion to decrease");
      console.log("3. Use this script again (it auto-adjusts gas prices)");
    }
    
    throw error;
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
