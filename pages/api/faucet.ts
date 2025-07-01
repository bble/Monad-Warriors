import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, MWAR_TOKEN_ABI } from '@/utils/contractABI';

const provider = new ethers.JsonRpcProvider(
  process.env.MONAD_TESTNET_RPC_URL || 'https://testnet-rpc.monad.xyz'
);

// 创建钱包实例（使用私钥）
const wallet = process.env.PRIVATE_KEY 
  ? new ethers.Wallet(process.env.PRIVATE_KEY, provider)
  : null;

// 水龙头配置
const FAUCET_AMOUNT = ethers.parseEther('1000'); // 1000 MWAR
const COOLDOWN_TIME = 24 * 60 * 60 * 1000; // 24小时（毫秒）

// 简单的内存存储（生产环境应使用数据库）
const lastClaimTimes: { [address: string]: number } = {};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 检查是否有钱包配置（生产环境需要）
  if (!wallet) {
    // 如果没有钱包配置，返回配置错误而不是模拟响应
    return res.status(503).json({
      error: 'Faucet wallet not configured',
      message: 'Please configure PRIVATE_KEY environment variable for faucet functionality'
    });
  }

  try {
    const { action, address } = req.body;

    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    const mwarContract = new ethers.Contract(
      CONTRACT_ADDRESSES.MWAR_TOKEN,
      MWAR_TOKEN_ABI,
      wallet
    );

    switch (action) {
      case 'claim':
        // 检查冷却时间
        const lastClaim = lastClaimTimes[address] || 0;
        const now = Date.now();

        if (now - lastClaim < COOLDOWN_TIME) {
          const timeLeft = COOLDOWN_TIME - (now - lastClaim);
          return res.status(429).json({
            error: 'Cooldown active',
            timeLeft: Math.ceil(timeLeft / 1000)
          });
        }

        try {
          // 检查水龙头余额
          const faucetBalance = await mwarContract.balanceOf(wallet.address);
          if (faucetBalance < FAUCET_AMOUNT) {
            return res.status(500).json({ error: 'Faucet is empty' });
          }

          // 使用管理员分发功能发送代币
          const tx = await mwarContract.distributeTestTokens(address, FAUCET_AMOUNT, {
            gasLimit: 300000,
            maxFeePerGas: ethers.parseUnits("100", "gwei"), // 大幅提高到100 gwei
            maxPriorityFeePerGas: ethers.parseUnits("10", "gwei") // 提高优先费到10 gwei
          });

          // 记录领取时间
          lastClaimTimes[address] = now;

          return res.status(200).json({
            success: true,
            txHash: tx.hash,
            amount: ethers.formatEther(FAUCET_AMOUNT)
          });
        } catch (error) {
          console.error('Faucet transfer error:', error);
          return res.status(500).json({
            error: 'Transfer failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }

      case 'status':
        const lastClaimTime = lastClaimTimes[address] || 0;
        const currentTime = Date.now();
        const canClaim = currentTime - lastClaimTime >= COOLDOWN_TIME;
        const timeUntilNext = canClaim ? 0 : COOLDOWN_TIME - (currentTime - lastClaimTime);

        return res.status(200).json({
          canClaim,
          timeUntilNext: Math.ceil(timeUntilNext / 1000),
          amount: ethers.formatEther(FAUCET_AMOUNT)
        });

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Faucet API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
