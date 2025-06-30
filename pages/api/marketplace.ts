import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, MARKETPLACE_ABI, MWAR_TOKEN_ABI } from '@/utils/contractABI';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, category = 'all', sortBy = 'recent', priceFilter, listingId, buyer, seller, player, nftType, tokenId, price, bidAmount } = req.body;

    // 连接到Monad testnet
    const provider = new ethers.JsonRpcProvider(
      process.env.MONAD_TESTNET_RPC_URL || 'https://testnet-rpc.monad.xyz'
    );

    if (action === 'getActiveListings') {
      // 检查市场合约是否已部署
      if (!CONTRACT_ADDRESSES.MARKETPLACE || CONTRACT_ADDRESSES.MARKETPLACE === '0x0000000000000000000000000000000000000000') {
        return res.status(200).json({ listings: [] });
      }

      try {
        // 创建市场合约实例（只读）
        const marketplaceContract = new ethers.Contract(
          CONTRACT_ADDRESSES.MARKETPLACE,
          MARKETPLACE_ABI,
          provider
        );

        // 获取活跃的市场列表
        const activeListingIds = await marketplaceContract.getActiveListings();

        if (activeListingIds.length === 0) {
          return res.status(200).json({ listings: [] });
        }

        // 获取每个列表的详情
        const listings = [];
        for (const listingId of activeListingIds) {
          try {
            const listing = await marketplaceContract.getListing(listingId);
            listings.push({
              id: listingId.toString(),
              seller: listing[1],
              nftType: listing[2], // 0: Hero, 1: Equipment
              nftContract: listing[3],
              tokenId: listing[4].toString(),
              listingType: listing[5], // 0: FixedPrice, 1: Auction
              price: ethers.formatEther(listing[6]),
              endTime: listing[7].toString(),
              highestBidder: listing[8],
              highestBid: ethers.formatEther(listing[9]),
              status: listing[10],
              createdAt: listing[11].toString()
            });
          } catch (error) {
            console.error(`Failed to get listing ${listingId}:`, error);
          }
        }

        return res.status(200).json({ listings });

      } catch (contractError: any) {
        console.error('Contract error:', contractError);
        return res.status(200).json({ listings: [] });
      }
    }

    if (action === 'listItem') {
      if (!player || nftType === undefined || !tokenId || !price) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      try {
        // 私钥用于签名交易
        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) {
          return res.status(500).json({ error: 'Server configuration error' });
        }

        const wallet = new ethers.Wallet(privateKey, provider);

        // 创建市场合约实例
        const marketplaceContract = new ethers.Contract(
          CONTRACT_ADDRESSES.MARKETPLACE,
          MARKETPLACE_ABI,
          wallet
        );

        // 将价格转换为wei
        const priceInWei = ethers.parseEther(price.toString());

        // 调用上架函数
        const tx = await marketplaceContract.listItem(
          nftType,
          tokenId,
          priceInWei,
          { gasLimit: 500000, gasPrice: ethers.parseUnits('15', 'gwei') }
        );

        await tx.wait();

        return res.status(200).json({
          success: true,
          txHash: tx.hash,
          message: 'Item listed successfully'
        });

      } catch (contractError: any) {
        console.error('Contract error:', contractError);
        return res.status(400).json({
          error: contractError.message || 'Failed to list item'
        });
      }
    }

    if (action === 'buyItem') {
      if (!player || !listingId) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      try {
        // 私钥用于签名交易
        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) {
          return res.status(500).json({ error: 'Server configuration error' });
        }

        const wallet = new ethers.Wallet(privateKey, provider);

        // 创建市场合约实例
        const marketplaceContract = new ethers.Contract(
          CONTRACT_ADDRESSES.MARKETPLACE,
          MARKETPLACE_ABI,
          wallet
        );

        // 创建MWAR代币合约实例
        const mwarContract = new ethers.Contract(
          CONTRACT_ADDRESSES.MWAR_TOKEN,
          MWAR_TOKEN_ABI,
          wallet
        );

        // 获取列表信息
        const listing = await marketplaceContract.getListing(listingId);
        const totalPrice = listing[6]; // price in wei

        // 检查玩家MWAR余额
        const balance = await mwarContract.balanceOf(player);

        if (balance < totalPrice) {
          return res.status(400).json({ error: 'Insufficient MWAR balance' });
        }

        // 调用购买函数
        const tx = await marketplaceContract.buyItem(
          listingId,
          { gasLimit: 500000, gasPrice: ethers.parseUnits('15', 'gwei') }
        );

        await tx.wait();

        return res.status(200).json({
          success: true,
          txHash: tx.hash,
          message: 'Item purchased successfully'
        });

      } catch (contractError: any) {
        console.error('Contract error:', contractError);
        return res.status(400).json({
          error: contractError.message || 'Failed to purchase item'
        });
      }
    }

    // 默认获取市场列表（向后兼容）
    try {
      // 创建市场合约实例（只读）
      const marketplaceContract = new ethers.Contract(
        CONTRACT_ADDRESSES.MARKETPLACE,
        MARKETPLACE_ABI,
        provider
      );

      // 获取活跃的市场列表
      const activeListingIds = await marketplaceContract.getActiveListings();

      return res.status(200).json({
        listings: activeListingIds || [],
        category,
        sortBy,
        priceFilter
      });

    } catch (contractError) {
      // 如果合约调用失败，返回空市场
      return res.status(200).json({
        listings: [],
        category,
        sortBy,
        priceFilter
      });
    }

  } catch (error) {
    console.error('Marketplace API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
