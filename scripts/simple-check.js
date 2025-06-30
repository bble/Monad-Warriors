const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Simple contract check...");

  try {
    // 检查网络连接
    const provider = ethers.provider;
    const network = await provider.getNetwork();
    console.log("🌐 Connected to network:", network.name, "Chain ID:", network.chainId.toString());

    // 检查账户
    const signers = await ethers.getSigners();
    if (signers.length === 0) {
      console.error("❌ No signers available. Check your PRIVATE_KEY in .env");
      return;
    }

    const deployer = signers[0];
    console.log("👤 Account:", deployer.address);

    // 检查账户余额
    const balance = await provider.getBalance(deployer.address);
    console.log("💰 MON Balance:", ethers.formatEther(balance));

    // 合约地址
    const mwarAddress = "0xD2f5d0418577BBCC98aAc97807e433dd091C1Be8";
    console.log("🪙 MWAR Contract:", mwarAddress);

    // 检查合约是否存在
    const code = await provider.getCode(mwarAddress);
    if (code === "0x") {
      console.error("❌ No contract found at MWAR address");
      return;
    }
    console.log("✅ MWAR contract exists");

    // 尝试连接到MWAR合约
    const mwar = await ethers.getContractAt("MWARToken", mwarAddress);
    
    // 检查基本信息
    const name = await mwar.name();
    const symbol = await mwar.symbol();
    console.log("📋 Token Name:", name);
    console.log("📋 Token Symbol:", symbol);

    // 检查总供应量
    const totalSupply = await mwar.totalSupply();
    console.log("📊 Total Supply:", ethers.formatEther(totalSupply), "MWAR");

    // 检查你的余额
    const yourBalance = await mwar.balanceOf(deployer.address);
    console.log("💰 Your MWAR Balance:", ethers.formatEther(yourBalance), "MWAR");

    // 检查游戏奖励池地址
    const gameRewardsPool = await mwar.gameRewardsPool();
    console.log("🎮 Game Rewards Pool:", gameRewardsPool);

    // 检查游戏奖励池余额
    const poolBalance = await mwar.balanceOf(gameRewardsPool);
    console.log("🎁 Pool Balance:", ethers.formatEther(poolBalance), "MWAR");

    // 检查是否你就是游戏奖励池
    if (gameRewardsPool.toLowerCase() === deployer.address.toLowerCase()) {
      console.log("✅ You are the game rewards pool!");
      console.log("💡 You should have", ethers.formatEther(poolBalance), "MWAR");
    } else {
      console.log("⚠️  Game rewards pool is a different address");
    }

    console.log("\n🎯 Summary:");
    console.log("- Network: Connected ✅");
    console.log("- Contract: Deployed ✅");
    console.log("- Your Balance:", ethers.formatEther(yourBalance), "MWAR");
    
    if (yourBalance > 0) {
      console.log("🎉 You have MWAR tokens!");
      console.log("💡 If MetaMask shows 0, add the token manually:");
      console.log("   Contract: " + mwarAddress);
      console.log("   Symbol: MWAR");
      console.log("   Decimals: 18");
    } else {
      console.log("❌ No MWAR tokens found in your account");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    
    if (error.message.includes("could not detect network")) {
      console.log("💡 Network issue. Check your RPC URL and internet connection");
    } else if (error.message.includes("private key")) {
      console.log("💡 Private key issue. Check your .env file");
    } else if (error.message.includes("insufficient funds")) {
      console.log("💡 Insufficient MON for gas fees");
    }
  }
}

main().catch(console.error);
