const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Starting optimized deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  // 检查余额
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "MON");
  
  if (balance < ethers.parseEther("0.1")) {
    console.log("⚠️  Warning: Low balance, deployment might fail");
  }

  // 部署配置
  const deployConfig = {
    // 钱包地址配置
    gameRewardsPool: deployer.address,  // 游戏奖励池
    teamWallet: deployer.address,       // 团队钱包
    investorWallet: deployer.address,   // 投资者钱包
    communityWallet: deployer.address,  // 社区钱包
    ecosystemWallet: deployer.address,  // 生态钱包
    
    // Gas配置
    gasPrice: ethers.parseUnits("20", "gwei"),
    gasLimit: 6000000,
  };

  console.log("⚙️  Deploy configuration:");
  console.log("   Game Rewards Pool:", deployConfig.gameRewardsPool);
  console.log("   Gas Price:", ethers.formatUnits(deployConfig.gasPrice, "gwei"), "gwei");
  console.log("   Gas Limit:", deployConfig.gasLimit);

  const deployedContracts = {};

  try {
    // 1. 部署 MWAR Token
    console.log("\n📦 Deploying MWAR Token...");
    const MWARToken = await ethers.getContractFactory("MWARToken");
    const mwarToken = await MWARToken.deploy(
      deployConfig.gameRewardsPool,
      deployConfig.teamWallet,
      deployConfig.investorWallet,
      deployConfig.communityWallet,
      deployConfig.ecosystemWallet,
      {
        gasPrice: deployConfig.gasPrice,
        gasLimit: deployConfig.gasLimit
      }
    );
    await mwarToken.waitForDeployment();
    deployedContracts.MWAR_TOKEN = await mwarToken.getAddress();
    console.log("✅ MWAR Token deployed to:", deployedContracts.MWAR_TOKEN);

    // 2. 部署 Hero NFT
    console.log("\n🦸 Deploying Hero NFT...");
    const HeroNFT = await ethers.getContractFactory("HeroNFT");
    const heroNFT = await HeroNFT.deploy(
      deployedContracts.MWAR_TOKEN,
      {
        gasPrice: deployConfig.gasPrice,
        gasLimit: deployConfig.gasLimit
      }
    );
    await heroNFT.waitForDeployment();
    deployedContracts.HERO_NFT = await heroNFT.getAddress();
    console.log("✅ Hero NFT deployed to:", deployedContracts.HERO_NFT);

    // 3. 部署 Game Core
    console.log("\n🎮 Deploying Game Core...");
    const GameCore = await ethers.getContractFactory("GameCore");
    const gameCore = await GameCore.deploy(
      deployedContracts.MWAR_TOKEN,
      deployedContracts.HERO_NFT,
      {
        gasPrice: deployConfig.gasPrice,
        gasLimit: deployConfig.gasLimit
      }
    );
    await gameCore.waitForDeployment();
    deployedContracts.GAME_CORE = await gameCore.getAddress();
    console.log("✅ Game Core deployed to:", deployedContracts.GAME_CORE);

    // 4. 配置合约权限
    console.log("\n🔧 Configuring contract permissions...");
    
    // 添加 GameCore 为游戏合约
    console.log("   Adding GameCore as game contract...");
    const addGameContractTx = await mwarToken.addGameContract(deployedContracts.GAME_CORE, {
      gasPrice: deployConfig.gasPrice
    });
    await addGameContractTx.wait();
    console.log("   ✅ GameCore added as game contract");

    // 5. 验证部署
    console.log("\n🔍 Verifying deployment...");
    
    // 检查代币总供应量
    const totalSupply = await mwarToken.totalSupply();
    console.log("   MWAR Total Supply:", ethers.formatEther(totalSupply));
    
    // 检查游戏奖励池余额
    const poolBalance = await mwarToken.balanceOf(deployConfig.gameRewardsPool);
    console.log("   Game Rewards Pool Balance:", ethers.formatEther(poolBalance));
    
    // 检查 GameCore 是否为游戏合约
    const isGameContract = await mwarToken.isGameContract(deployedContracts.GAME_CORE);
    console.log("   GameCore is game contract:", isGameContract);

    // 6. 保存部署信息
    const deploymentInfo = {
      network: "monadTestnet",
      chainId: 10143,
      deployer: deployer.address,
      deployedAt: new Date().toISOString(),
      contracts: deployedContracts,
      config: deployConfig,
      verification: {
        totalSupply: ethers.formatEther(totalSupply),
        poolBalance: ethers.formatEther(poolBalance),
        isGameContract: isGameContract
      }
    };

    // 保存到文件
    const deploymentPath = path.join(__dirname, '..', 'deployment-info.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("📄 Deployment info saved to:", deploymentPath);

    // 更新环境变量文件
    console.log("\n📝 Updating environment variables...");
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // 更新合约地址
    const contractVars = [
      `NEXT_PUBLIC_MWAR_TOKEN_ADDRESS=${deployedContracts.MWAR_TOKEN}`,
      `NEXT_PUBLIC_HERO_NFT_ADDRESS=${deployedContracts.HERO_NFT}`,
      `NEXT_PUBLIC_GAME_CORE_ADDRESS=${deployedContracts.GAME_CORE}`,
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

    // 更新合约ABI文件
    console.log("\n📋 Updating contract ABIs...");
    const abiPath = path.join(__dirname, '..', 'utils', 'contractABI.ts');
    
    const mwarABI = JSON.stringify(mwarToken.interface.fragments);
    const heroABI = JSON.stringify(heroNFT.interface.fragments);
    const gameABI = JSON.stringify(gameCore.interface.fragments);
    
    const abiContent = `// Auto-generated ABI exports
// Generated on: ${new Date().toISOString()}

export const MWAR_TOKEN_ABI = ${mwarABI} as const;

export const HERO_NFT_ABI = ${heroABI} as const;

export const GAME_CORE_ABI = ${gameABI} as const;

// Contract addresses (update these after deployment)
export const CONTRACT_ADDRESSES = {
  MWAR_TOKEN: '${deployedContracts.MWAR_TOKEN}',
  HERO_NFT: '${deployedContracts.HERO_NFT}',
  GAME_CORE: '${deployedContracts.GAME_CORE}',
} as const;
`;

    fs.writeFileSync(abiPath, abiContent);
    console.log("✅ Contract ABIs updated");

    // 7. 部署总结
    console.log("\n🎉 Deployment completed successfully!");
    console.log("=" .repeat(50));
    console.log("📋 Contract Addresses:");
    console.log("   MWAR Token:", deployedContracts.MWAR_TOKEN);
    console.log("   Hero NFT:", deployedContracts.HERO_NFT);
    console.log("   Game Core:", deployedContracts.GAME_CORE);
    console.log("");
    console.log("🔗 Blockchain Explorer:");
    console.log("   MWAR Token: https://testnet.monadexplorer.com/address/" + deployedContracts.MWAR_TOKEN);
    console.log("   Hero NFT: https://testnet.monadexplorer.com/address/" + deployedContracts.HERO_NFT);
    console.log("   Game Core: https://testnet.monadexplorer.com/address/" + deployedContracts.GAME_CORE);
    console.log("");
    console.log("💡 Next Steps:");
    console.log("   1. Test the faucet function");
    console.log("   2. Try minting a hero");
    console.log("   3. Test the battle system");
    console.log("   4. Check the frontend integration");
    console.log("");
    console.log("🚀 Your Monad Warriors game is ready to play!");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    
    // 如果部分合约已部署，显示已部署的地址
    if (Object.keys(deployedContracts).length > 0) {
      console.log("\n📋 Partially deployed contracts:");
      Object.entries(deployedContracts).forEach(([name, address]) => {
        console.log(`   ${name}: ${address}`);
      });
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
