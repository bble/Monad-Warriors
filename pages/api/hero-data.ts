import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, HERO_NFT_ABI } from '@/utils/contractABI';

const provider = new ethers.JsonRpcProvider(
  process.env.MONAD_TESTNET_RPC_URL || 'https://testnet-rpc.monad.xyz'
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, owner, index, tokenId } = req.body;

    const heroContract = new ethers.Contract(
      CONTRACT_ADDRESSES.HERO_NFT,
      HERO_NFT_ABI,
      provider
    );

    switch (action) {
      case 'getTokenOfOwnerByIndex':
        try {
          const tokenIdResult = await heroContract.tokenOfOwnerByIndex(owner, index);
          return res.status(200).json({ tokenId: tokenIdResult.toString() });
        } catch (error) {
          console.error('Error getting token by index:', error);
          return res.status(500).json({ error: 'Failed to get token ID' });
        }

      case 'getHeroAttributes':
        try {
          const attributes = await heroContract.getHeroAttributes(tokenId);
          return res.status(200).json({
            strength: attributes.strength.toString(),
            intelligence: attributes.intelligence.toString(),
            agility: attributes.agility.toString(),
            vitality: attributes.vitality.toString(),
            luck: attributes.luck.toString(),
            level: attributes.level.toString(),
            experience: attributes.experience.toString(),
            rarity: attributes.rarity,
            class: attributes.class,
            birthTime: attributes.birthTime.toString()
          });
        } catch (error) {
          console.error('Error getting hero attributes:', error);
          return res.status(500).json({ error: 'Failed to get hero attributes' });
        }

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
