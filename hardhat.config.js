require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    monadTestnet: {
      url: process.env.MONAD_TESTNET_RPC_URL || "https://testnet-rpc.monad.xyz",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 10143, // Monad Testnet Chain ID
      gasPrice: 35000000000, // 35 gwei - 确保能够被包含
      gas: 5000000, // 合理的gas限制
      maxFeePerGas: 40000000000, // 40 gwei - 留有余量
      maxPriorityFeePerGas: 2000000000, // 2 gwei - 适中的优先费
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
