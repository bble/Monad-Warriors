import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, EQUIPMENT_NFT_ABI, MWAR_TOKEN_ABI } from '@/utils/contractABI';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, player, equipmentType, rarity, name, mwarCost, owner, equipmentId } = req.body;

    // 连接到Monad testnet
    const provider = new ethers.JsonRpcProvider(
      process.env.MONAD_TESTNET_RPC_URL || 'https://testnet-rpc.monad.xyz'
    );

    if (action === 'craftEquipment') {
      if (!player || equipmentType === undefined || rarity === undefined || !name || !mwarCost) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      // 检查装备合约是否已部署
      if (!CONTRACT_ADDRESSES.EQUIPMENT_NFT || CONTRACT_ADDRESSES.EQUIPMENT_NFT === '0x0000000000000000000000000000000000000000') {
        return res.status(400).json({
          error: 'Equipment contract not deployed yet. This feature will be available after contract deployment.'
        });
      }

      try {
        // 私钥用于签名交易（在生产环境中应该使用更安全的方式）
        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) {
          return res.status(500).json({ error: 'Server configuration error' });
        }

        const wallet = new ethers.Wallet(privateKey, provider);

        // 创建装备合约实例
        const equipmentContract = new ethers.Contract(
          CONTRACT_ADDRESSES.EQUIPMENT_NFT,
          EQUIPMENT_NFT_ABI,
          wallet
        );

        // 创建MWAR代币合约实例
        const mwarContract = new ethers.Contract(
          CONTRACT_ADDRESSES.MWAR_TOKEN,
          MWAR_TOKEN_ABI,
          wallet
        );

        // 检查玩家MWAR余额
        const balance = await mwarContract.balanceOf(player);
        const cost = ethers.parseEther(mwarCost.toString());

        if (balance < cost) {
          return res.status(400).json({ error: 'Insufficient MWAR balance' });
        }

        // 调用制作装备函数
        const tx = await equipmentContract.craftEquipment(
          equipmentType,
          rarity,
          name,
          { gasLimit: 500000, gasPrice: ethers.parseUnits('15', 'gwei') }
        );

        await tx.wait();

        return res.status(200).json({
          success: true,
          txHash: tx.hash,
          message: 'Equipment crafted successfully'
        });

      } catch (contractError: any) {
        console.error('Contract error:', contractError);
        return res.status(400).json({
          error: contractError.message || 'Failed to craft equipment'
        });
      }
    }

    if (action === 'getUserEquipment') {
      if (!owner) {
        return res.status(400).json({ error: 'Missing owner' });
      }

      // 检查装备合约是否已部署
      if (!CONTRACT_ADDRESSES.EQUIPMENT_NFT || CONTRACT_ADDRESSES.EQUIPMENT_NFT === '0x0000000000000000000000000000000000000000') {
        return res.status(200).json({ equipment: [] });
      }

      try {
        // 创建装备合约实例（只读）
        const equipmentContract = new ethers.Contract(
          CONTRACT_ADDRESSES.EQUIPMENT_NFT,
          EQUIPMENT_NFT_ABI,
          provider
        );

        // 获取玩家的装备列表
        const equipmentIds = await equipmentContract.getPlayerEquipment(owner);

        if (equipmentIds.length === 0) {
          return res.status(200).json({ equipment: [] });
        }

        // 获取装备详情
        const equipmentDetails = await equipmentContract.getEquipmentsAttributes(equipmentIds);

        const equipment = equipmentDetails.map((attrs: any, index: number) => ({
          id: equipmentIds[index].toString(),
          name: attrs[0],
          type: ['weapon', 'armor', 'accessory'][attrs[1]],
          rarity: attrs[2],
          level: attrs[3].toString(),
          strengthBonus: attrs[4].toString(),
          intelligenceBonus: attrs[5].toString(),
          agilityBonus: attrs[6].toString(),
          vitalityBonus: attrs[7].toString(),
          luckBonus: attrs[8].toString(),
          durability: attrs[9].toString(),
          maxDurability: attrs[10].toString(),
          isEquipped: attrs[12],
          equippedToHero: attrs[13].toString()
        }));

        return res.status(200).json({ equipment });

      } catch (contractError: any) {
        console.error('Contract error:', contractError);
        // 如果合约调用失败，返回空装备
        return res.status(200).json({ equipment: [] });
      }
    }

    if (action === 'getEquipmentDetails') {
      if (!equipmentId) {
        return res.status(400).json({ error: 'Missing equipmentId' });
      }

      try {
        // 创建装备合约实例（只读）
        const equipmentContract = new ethers.Contract(
          CONTRACT_ADDRESSES.EQUIPMENT_NFT,
          EQUIPMENT_NFT_ABI,
          provider
        );

        // 获取装备详情
        const attrs = await equipmentContract.getEquipmentAttributes(equipmentId);

        const equipment = {
          id: equipmentId,
          name: attrs[0],
          type: ['weapon', 'armor', 'accessory'][attrs[1]],
          rarity: attrs[2],
          level: attrs[3].toString(),
          strengthBonus: attrs[4].toString(),
          intelligenceBonus: attrs[5].toString(),
          agilityBonus: attrs[6].toString(),
          vitalityBonus: attrs[7].toString(),
          luckBonus: attrs[8].toString(),
          durability: attrs[9].toString(),
          maxDurability: attrs[10].toString(),
          isEquipped: attrs[12],
          equippedToHero: attrs[13].toString()
        };

        return res.status(200).json({ equipment });
      } catch (error: any) {
        console.error('Equipment details error:', error);
        return res.status(404).json({ error: 'Equipment not found' });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('Equipment API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
