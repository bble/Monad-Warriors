import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, HERO_NFT_ABI } from '@/utils/contractABI';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, owner, index, tokenId } = req.body;

    // 连接到Monad testnet
    const provider = new ethers.JsonRpcProvider(
      process.env.MONAD_TESTNET_RPC_URL || 'https://testnet-rpc.monad.xyz'
    );

    // 创建合约实例
    const heroContract = new ethers.Contract(
      CONTRACT_ADDRESSES.HERO_NFT,
      HERO_NFT_ABI,
      provider
    );

    if (action === 'getTokenByIndex') {
      if (!owner || index === undefined) {
        return res.status(400).json({ error: 'Missing owner or index' });
      }

      try {
        const tokenId = await heroContract.tokenOfOwnerByIndex(owner, index);
        return res.status(200).json({ tokenId: tokenId.toString() });
      } catch (error) {
        return res.status(404).json({ error: 'Token not found' });
      }
    }

    if (action === 'getAttributes') {
      if (!tokenId) {
        return res.status(400).json({ error: 'Missing tokenId' });
      }

      try {
        const attributes = await heroContract.getHeroAttributes(tokenId);
        
        return res.status(200).json({
          attributes: {
            strength: attributes[0].toString(),
            intelligence: attributes[1].toString(),
            agility: attributes[2].toString(),
            vitality: attributes[3].toString(),
            luck: attributes[4].toString(),
            level: attributes[5].toString(),
            experience: attributes[6].toString(),
            rarity: Number(attributes[7]),
            class: Number(attributes[8]),
            birthTime: attributes[9].toString()
          }
        });
      } catch (error) {
        return res.status(404).json({ error: 'Hero attributes not found' });
      }
    }

    if (action === 'getPower') {
      if (!tokenId) {
        return res.status(400).json({ error: 'Missing tokenId' });
      }

      try {
        const power = await heroContract.getHeroPower(tokenId);
        return res.status(200).json({ power: power.toString() });
      } catch (error) {
        return res.status(404).json({ error: 'Hero power not found' });
      }
    }

    if (action === 'getBalance') {
      if (!owner) {
        return res.status(400).json({ error: 'Missing owner' });
      }

      try {
        const balance = await heroContract.balanceOf(owner);
        return res.status(200).json({ balance: balance.toString() });
      } catch (error) {
        return res.status(500).json({ error: 'Failed to get balance' });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('Heroes API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
