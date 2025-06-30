const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🔄 Updating frontend with deployed contract information...");

  // 合约地址
  const addresses = {
    MWAR_TOKEN: "0xD2f5d0418577BBCC98aAc97807e433dd091C1Be8",
    HERO_NFT: "0xcD7Cd65d4bE940280B752e10C3eEb6D6cF53B18D",
    GAME_CORE: "0xecde73957F1c15cE2E225fA4F485ABE03fcC7E48"
  };

  try {
    // 1. 提取完整ABI
    console.log("📋 1. Extracting contract ABIs...");
    
    const MWARToken = await ethers.getContractFactory("MWARToken");
    const HeroNFT = await ethers.getContractFactory("HeroNFT");
    const GameCore = await ethers.getContractFactory("GameCore");

    const mwarABI = JSON.parse(MWARToken.interface.formatJson());
    const heroABI = JSON.parse(HeroNFT.interface.formatJson());
    const gameABI = JSON.parse(GameCore.interface.formatJson());

    // 2. 创建ABI目录
    const abiDir = path.join(__dirname, '..', 'abis');
    if (!fs.existsSync(abiDir)) {
      fs.mkdirSync(abiDir, { recursive: true });
    }

    // 3. 保存ABI文件
    fs.writeFileSync(path.join(abiDir, 'MWARToken.json'), JSON.stringify(mwarABI, null, 2));
    fs.writeFileSync(path.join(abiDir, 'HeroNFT.json'), JSON.stringify(heroABI, null, 2));
    fs.writeFileSync(path.join(abiDir, 'GameCore.json'), JSON.stringify(gameABI, null, 2));

    console.log("✅ ABI files saved to /abis directory");

    // 4. 更新web3Config.ts
    console.log("🔧 2. Updating web3Config.ts...");
    
    const web3ConfigPath = path.join(__dirname, '..', 'utils', 'web3Config.ts');
    let web3Config = fs.readFileSync(web3ConfigPath, 'utf8');

    // 更新合约地址部分
    const addressesSection = `// 合约地址 - 已部署的真实地址
export const CONTRACT_ADDRESSES = {
  MWAR_TOKEN: process.env.NEXT_PUBLIC_MWAR_TOKEN_ADDRESS || '${addresses.MWAR_TOKEN}',
  HERO_NFT: process.env.NEXT_PUBLIC_HERO_NFT_ADDRESS || '${addresses.HERO_NFT}',
  GAME_CORE: process.env.NEXT_PUBLIC_GAME_CORE_ADDRESS || '${addresses.GAME_CORE}',
} as const;`;

    // 替换合约地址部分
    web3Config = web3Config.replace(
      /\/\/ 合约地址.*?\};/s,
      addressesSection
    );

    fs.writeFileSync(web3ConfigPath, web3Config);
    console.log("✅ web3Config.ts updated with contract addresses");

    // 5. 验证.env文件
    console.log("📝 3. Checking .env file...");
    
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // 检查是否包含合约地址
    const requiredVars = [
      `NEXT_PUBLIC_MWAR_TOKEN_ADDRESS=${addresses.MWAR_TOKEN}`,
      `NEXT_PUBLIC_HERO_NFT_ADDRESS=${addresses.HERO_NFT}`,
      `NEXT_PUBLIC_GAME_CORE_ADDRESS=${addresses.GAME_CORE}`
    ];

    let envUpdated = false;
    requiredVars.forEach(varLine => {
      const [key] = varLine.split('=');
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, varLine);
      } else {
        envContent += `\n${varLine}`;
        envUpdated = true;
      }
    });

    if (envUpdated) {
      fs.writeFileSync(envPath, envContent);
      console.log("✅ .env file updated with contract addresses");
    } else {
      console.log("✅ .env file already contains contract addresses");
    }

    // 6. 创建合约验证脚本
    console.log("🔍 4. Creating contract verification...");
    
    const verifyScript = `// Auto-generated contract verification
import { ethers } from 'ethers';

export const DEPLOYED_CONTRACTS = {
  MWAR_TOKEN: '${addresses.MWAR_TOKEN}',
  HERO_NFT: '${addresses.HERO_NFT}',
  GAME_CORE: '${addresses.GAME_CORE}',
  NETWORK: 'monadTestnet',
  CHAIN_ID: 10143,
  DEPLOYED_AT: '${new Date().toISOString()}'
} as const;

export const verifyContractAddresses = () => {
  const addresses = Object.values(DEPLOYED_CONTRACTS);
  return addresses.every(addr => 
    typeof addr === 'string' && 
    addr.startsWith('0x') && 
    addr.length === 42
  );
};`;

    fs.writeFileSync(
      path.join(__dirname, '..', 'utils', 'deployedContracts.ts'), 
      verifyScript
    );

    console.log("✅ Contract verification file created");

    // 7. 输出摘要
    console.log("\n" + "=".repeat(60));
    console.log("🎉 FRONTEND UPDATE COMPLETED!");
    console.log("=".repeat(60));
    console.log("📋 Updated Files:");
    console.log("   ✅ /abis/MWARToken.json");
    console.log("   ✅ /abis/HeroNFT.json");
    console.log("   ✅ /abis/GameCore.json");
    console.log("   ✅ utils/web3Config.ts");
    console.log("   ✅ .env");
    console.log("   ✅ utils/deployedContracts.ts");

    console.log("\n🔗 Contract Addresses:");
    console.log("   🪙 MWAR Token:", addresses.MWAR_TOKEN);
    console.log("   ⚔️ Hero NFT:", addresses.HERO_NFT);
    console.log("   🎮 Game Core:", addresses.GAME_CORE);

    console.log("\n🚀 Next Steps:");
    console.log("1. npm run dev                 # Start the frontend");
    console.log("2. Connect your wallet");
    console.log("3. Test hero minting");
    console.log("4. Enjoy your GameFi app!");

    console.log("\n💡 Verification:");
    console.log("Run: npx hardhat run scripts/verify-contracts.js --network monadTestnet");

  } catch (error) {
    console.error("❌ Update failed:", error);
  }
}

main().catch(console.error);
