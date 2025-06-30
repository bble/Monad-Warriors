const { ethers } = require("hardhat");

async function main() {
  // 要发送代币的地址 - 请替换为你的钱包地址
  const recipientAddress = process.argv[2] || "YOUR_WALLET_ADDRESS_HERE"; // 可以通过命令行参数传入
  const amount = ethers.parseEther("10000"); // 10000 MWAR

  console.log("🚀 Sending MWAR tokens...");
  console.log("Recipient:", recipientAddress);
  console.log("Amount:", ethers.formatEther(amount), "MWAR");

  if (recipientAddress === "YOUR_WALLET_ADDRESS_HERE") {
    console.log("❌ Please update the recipient address in the script!");
    console.log("Edit scripts/send-tokens.js and replace YOUR_WALLET_ADDRESS_HERE with your actual wallet address");
    return;
  }

  try {
    // 获取合约实例
    const mwarToken = await ethers.getContractAt("MWARToken", "0xD2f5d0418577BBCC98aAc97807e433dd091C1Be8");
    
    // 获取发送者账户
    const [sender] = await ethers.getSigners();
    console.log("📝 Sending from:", sender.address);
    
    // 检查发送者余额
    const senderBalance = await mwarToken.balanceOf(sender.address);
    console.log("💰 Sender balance:", ethers.formatEther(senderBalance), "MWAR");
    
    if (senderBalance < amount) {
      console.log("❌ Insufficient balance!");
      return;
    }
    
    // 检查接收者当前余额
    const currentBalance = await mwarToken.balanceOf(recipientAddress);
    console.log("📊 Recipient current balance:", ethers.formatEther(currentBalance), "MWAR");
    
    // 发送代币
    console.log("\n💸 Sending tokens...");
    const tx = await mwarToken.transfer(recipientAddress, amount);
    console.log("📝 Transaction hash:", tx.hash);
    
    // 等待确认
    console.log("⏳ Waiting for confirmation...");
    await tx.wait();
    console.log("✅ Transaction confirmed!");
    
    // 检查新余额
    const newBalance = await mwarToken.balanceOf(recipientAddress);
    console.log("🎉 Recipient new balance:", ethers.formatEther(newBalance), "MWAR");
    
    console.log("\n🎮 You can now use these tokens to mint heroes!");
    console.log("💡 Go to http://localhost:3001 and try minting a hero");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
