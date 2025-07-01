const { ethers, network } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Deploying Monad Warriors contracts...");

  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  // 检查账户余额
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "MON");

  if (balance < ethers.parseEther("0.1")) {
    console.log("⚠️  Warning: Low balance. You may need more MON for deployment.");
  }

  // 定义钱包地址 (在实际部署时应该使用不同的地址)
  const gameRewardsPool = deployer.address; // 40% - 400M MWAR
  const teamWallet = deployer.address;      // 15% - 150M MWAR
  const investorWallet = deployer.address;  // 20% - 200M MWAR
  const communityWallet = deployer.address; // 15% - 150M MWAR
  const ecosystemWallet = deployer.address; // 10% - 100M MWAR

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
    contracts: {}
  };

  try {
    // 获取当前网络的gas价格并设置合理的费用
    console.log("\n⛽ Getting current gas prices...");
    const feeData = await ethers.provider.getFeeData();
    console.log("Current gas price:", ethers.formatUnits(feeData.gasPrice || 0, "gwei"), "gwei");

    // 设置gas选项 - 比当前价格高50%以确保被包含
    const gasPrice = feeData.gasPrice ? feeData.gasPrice * BigInt(150) / BigInt(100) : ethers.parseUnits("50", "gwei");
    const gasOptions = {
      gasPrice: gasPrice,
      gasLimit: 5000000
    };
    console.log("Using gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");

    // 1. 部署MWAR Token
    console.log("\n🪙 1. Deploying MWAR Token...");
    const MWARToken = await ethers.getContractFactory("MWARToken");
    const mwarToken = await MWARToken.deploy(
      gameRewardsPool,
      teamWallet,
      investorWallet,
      communityWallet,
      ecosystemWallet,
      gasOptions
    );
    await mwarToken.waitForDeployment();
    const mwarAddress = await mwarToken.getAddress();
    console.log("✅ MWAR Token deployed to:", mwarAddress);
    deploymentData.contracts.mwarToken = mwarAddress;

    // 2. 部署Hero NFT
    console.log("\n⚔️ 2. Deploying Hero NFT...");
    const HeroNFT = await ethers.getContractFactory("HeroNFT");
    const heroNFT = await HeroNFT.deploy(mwarAddress, gasOptions);
    await heroNFT.waitForDeployment();
    const heroAddress = await heroNFT.getAddress();
    console.log("✅ Hero NFT deployed to:", heroAddress);
    deploymentData.contracts.heroNFT = heroAddress;

    // 3. 部署Game Core
    console.log("\n🎮 3. Deploying Game Core...");
    const GameCore = await ethers.getContractFactory("GameCore");
    const gameCore = await GameCore.deploy(mwarAddress, heroAddress, gasOptions);
    await gameCore.waitForDeployment();
    const gameAddress = await gameCore.getAddress();
    console.log("✅ Game Core deployed to:", gameAddress);
    deploymentData.contracts.gameCore = gameAddress;

    // 4. 配置权限
    console.log("\n🔐 4. Setting up permissions...");
    const tx1 = await mwarToken.addGameContract(gameAddress, gasOptions);
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

    // 确保deployments目录存在
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

    // 更新或添加合约地址
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
    console.log("\n" + "=".repeat(50));
    console.log("🎉 DEPLOYMENT SUCCESSFUL!");
    console.log("=".repeat(50));
    console.log("🌐 Network:", network.name);
    console.log("👤 Deployer:", deployer.address);
    console.log("🪙 MWAR Token:", mwarAddress);
    console.log("⚔️ Hero NFT:", heroAddress);
    console.log("🎮 Game Core:", gameAddress);
    console.log("=".repeat(50));

    console.log("\n📋 Copy these to your .env file:");
    console.log(`NEXT_PUBLIC_MWAR_TOKEN_ADDRESS=${mwarAddress}`);
    console.log(`NEXT_PUBLIC_HERO_NFT_ADDRESS=${heroAddress}`);
    console.log(`NEXT_PUBLIC_GAME_CORE_ADDRESS=${gameAddress}`);

    console.log("\n🔗 Useful commands:");
    console.log("npm run dev                 # Start the frontend");
    console.log("npm run test               # Run contract tests");
    console.log("npm run test:frontend      # Run frontend tests");

    return {
      mwarToken: mwarAddress,
      heroNFT: heroAddress,
      gameCore: gameAddress
    };

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;

module.exports = main;
