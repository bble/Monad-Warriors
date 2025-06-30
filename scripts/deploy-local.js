const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Local deployment for development...");

  // 模拟合约地址（用于开发测试）
  const mockAddresses = {
    mwarToken: "0x1234567890123456789012345678901234567890",
    heroNFT: "0x2345678901234567890123456789012345678901", 
    gameCore: "0x3456789012345678901234567890123456789012"
  };

  console.log("📝 Using mock contract addresses for development:");
  console.log("🪙 MWAR Token:", mockAddresses.mwarToken);
  console.log("⚔️ Hero NFT:", mockAddresses.heroNFT);
  console.log("🎮 Game Core:", mockAddresses.gameCore);

  // 更新环境变量文件
  console.log("\n📝 Updating environment variables...");
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // 更新或添加合约地址
  const contractVars = [
    `NEXT_PUBLIC_MWAR_TOKEN_ADDRESS=${mockAddresses.mwarToken}`,
    `NEXT_PUBLIC_HERO_NFT_ADDRESS=${mockAddresses.heroNFT}`,
    `NEXT_PUBLIC_GAME_CORE_ADDRESS=${mockAddresses.gameCore}`,
    `NEXT_PUBLIC_CHAIN_ID=10143`,
    `NEXT_PUBLIC_MONAD_TESTNET_RPC_URL=https://testnet-rpc.monad.xyz`
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
  console.log("✅ Environment variables updated with mock addresses");

  console.log("\n🎉 Local setup complete!");
  console.log("📋 Mock contract addresses configured for development");
  console.log("🔗 Run 'npm run dev' to start the frontend with mock data");

  return mockAddresses;
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
