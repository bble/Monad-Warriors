const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("📋 Extracting contract ABIs...");

  try {
    // 获取合约工厂来提取ABI
    const MWARToken = await ethers.getContractFactory("MWARToken");
    const HeroNFT = await ethers.getContractFactory("HeroNFT");
    const GameCore = await ethers.getContractFactory("GameCore");

    // 提取ABI
    const mwarABI = MWARToken.interface.formatJson();
    const heroABI = HeroNFT.interface.formatJson();
    const gameABI = GameCore.interface.formatJson();

    // 创建ABI目录
    const abiDir = path.join(__dirname, '..', 'abis');
    if (!fs.existsSync(abiDir)) {
      fs.mkdirSync(abiDir, { recursive: true });
    }

    // 保存ABI文件
    fs.writeFileSync(path.join(abiDir, 'MWARToken.json'), mwarABI);
    fs.writeFileSync(path.join(abiDir, 'HeroNFT.json'), heroABI);
    fs.writeFileSync(path.join(abiDir, 'GameCore.json'), gameABI);

    console.log("✅ ABI files saved to /abis directory:");
    console.log("   - MWARToken.json");
    console.log("   - HeroNFT.json");
    console.log("   - GameCore.json");

    // 生成TypeScript ABI文件
    const tsContent = `// Auto-generated ABI exports
// Generated on: ${new Date().toISOString()}

export const MWAR_TOKEN_ABI = ${mwarABI} as const;

export const HERO_NFT_ABI = ${heroABI} as const;

export const GAME_CORE_ABI = ${gameABI} as const;

// Contract addresses (update these after deployment)
export const CONTRACT_ADDRESSES = {
  MWAR_TOKEN: "0xD2f5d0418577BBCC98aAc97807e433dd091C1Be8",
  HERO_NFT: "0xcD7Cd65d4bE940280B752e10C3eEb6D6cF53B18D",
  GAME_CORE: "0xecde73957F1c15cE2E225fA4F485ABE03fcC7E48",
} as const;
`;

    fs.writeFileSync(path.join(__dirname, '..', 'utils', 'contractABI.ts'), tsContent);
    console.log("✅ TypeScript ABI file created: utils/contractABI.ts");

    console.log("\n🔗 Contract Addresses:");
    console.log("MWAR Token:", "0xD2f5d0418577BBCC98aAc97807e433dd091C1Be8");
    console.log("Hero NFT:", "0xcD7Cd65d4bE940280B752e10C3eEb6D6cF53B18D");
    console.log("Game Core:", "0xecde73957F1c15cE2E225fA4F485ABE03fcC7E48");

  } catch (error) {
    console.error("❌ Failed to extract ABIs:", error);
  }
}

main().catch(console.error);
