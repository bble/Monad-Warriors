import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, GUILD_SYSTEM_ABI, MWAR_TOKEN_ABI } from '@/utils/contractABI';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, player, guildName, description, guildId, amount } = req.body;

    // 连接到Monad testnet
    const provider = new ethers.JsonRpcProvider(
      process.env.MONAD_TESTNET_RPC_URL || 'https://testnet-rpc.monad.xyz'
    );

    if (action === 'getActiveGuilds') {
      // 检查公会合约是否已部署
      if (!CONTRACT_ADDRESSES.GUILD_SYSTEM || CONTRACT_ADDRESSES.GUILD_SYSTEM === '0x0000000000000000000000000000000000000000') {
        return res.status(200).json({ guilds: [] });
      }

      try {
        // 创建公会合约实例（只读）
        const guildContract = new ethers.Contract(
          CONTRACT_ADDRESSES.GUILD_SYSTEM,
          GUILD_SYSTEM_ABI,
          provider
        );

        // 获取活跃的公会列表
        const activeGuildIds = await guildContract.getActiveGuilds();
        
        if (activeGuildIds.length === 0) {
          return res.status(200).json({ guilds: [] });
        }

        // 获取每个公会的详情
        const guilds = [];
        for (const guildId of activeGuildIds) {
          try {
            const guild = await guildContract.guilds(guildId);
            if (guild.isActive) {
              guilds.push({
                id: guildId.toString(),
                name: guild.name,
                description: guild.description,
                leader: guild.leader,
                level: guild.level.toString(),
                experience: guild.experience.toString(),
                treasury: ethers.formatEther(guild.treasury),
                memberCount: guild.memberCount.toString(),
                createdAt: guild.createdAt.toString()
              });
            }
          } catch (error) {
            console.error(`Failed to get guild ${guildId}:`, error);
          }
        }

        return res.status(200).json({ guilds });

      } catch (contractError: any) {
        console.error('Contract error:', contractError);
        return res.status(200).json({ guilds: [] });
      }
    }

    if (action === 'createGuild') {
      if (!player || !guildName || !description) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      // 检查公会合约是否已部署
      if (!CONTRACT_ADDRESSES.GUILD_SYSTEM || CONTRACT_ADDRESSES.GUILD_SYSTEM === '0x0000000000000000000000000000000000000000') {
        return res.status(400).json({
          error: 'Guild contract not deployed yet. This feature will be available after contract deployment.'
        });
      }

      try {
        // 私钥用于签名交易
        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) {
          return res.status(500).json({ error: 'Server configuration error' });
        }

        const wallet = new ethers.Wallet(privateKey, provider);

        // 创建公会合约实例
        const guildContract = new ethers.Contract(
          CONTRACT_ADDRESSES.GUILD_SYSTEM,
          GUILD_SYSTEM_ABI,
          wallet
        );

        // 创建MWAR代币合约实例
        const mwarContract = new ethers.Contract(
          CONTRACT_ADDRESSES.MWAR_TOKEN,
          MWAR_TOKEN_ABI,
          wallet
        );

        // 检查玩家MWAR余额（创建公会需要1000 MWAR）
        const balance = await mwarContract.balanceOf(player);
        const creationCost = ethers.parseEther('1000'); // 1000 MWAR
        
        if (balance < creationCost) {
          return res.status(400).json({ error: 'Insufficient MWAR balance (need 1000 MWAR)' });
        }

        // 调用创建公会函数
        const tx = await guildContract.createGuild(
          guildName,
          description,
          { gasLimit: 500000, gasPrice: ethers.parseUnits('15', 'gwei') }
        );

        await tx.wait();

        return res.status(200).json({
          success: true,
          txHash: tx.hash,
          message: 'Guild created successfully'
        });

      } catch (contractError: any) {
        console.error('Contract error:', contractError);
        return res.status(400).json({ 
          error: contractError.message || 'Failed to create guild'
        });
      }
    }

    if (action === 'joinGuild') {
      if (!player || !guildId) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      try {
        // 私钥用于签名交易
        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) {
          return res.status(500).json({ error: 'Server configuration error' });
        }

        const wallet = new ethers.Wallet(privateKey, provider);

        // 创建公会合约实例
        const guildContract = new ethers.Contract(
          CONTRACT_ADDRESSES.GUILD_SYSTEM,
          GUILD_SYSTEM_ABI,
          wallet
        );

        // 调用加入公会函数
        const tx = await guildContract.joinGuild(
          guildId,
          { gasLimit: 300000, gasPrice: ethers.parseUnits('15', 'gwei') }
        );

        await tx.wait();

        return res.status(200).json({
          success: true,
          txHash: tx.hash,
          message: 'Joined guild successfully'
        });

      } catch (contractError: any) {
        console.error('Contract error:', contractError);
        return res.status(400).json({ 
          error: contractError.message || 'Failed to join guild'
        });
      }
    }

    if (action === 'contributeToGuild') {
      if (!player || !amount) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      try {
        // 私钥用于签名交易
        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) {
          return res.status(500).json({ error: 'Server configuration error' });
        }

        const wallet = new ethers.Wallet(privateKey, provider);

        // 创建公会合约实例
        const guildContract = new ethers.Contract(
          CONTRACT_ADDRESSES.GUILD_SYSTEM,
          GUILD_SYSTEM_ABI,
          wallet
        );

        // 创建MWAR代币合约实例
        const mwarContract = new ethers.Contract(
          CONTRACT_ADDRESSES.MWAR_TOKEN,
          MWAR_TOKEN_ABI,
          wallet
        );

        // 将贡献金额转换为wei
        const contributionAmount = ethers.parseEther(amount.toString());

        // 检查玩家MWAR余额
        const balance = await mwarContract.balanceOf(player);
        
        if (balance < contributionAmount) {
          return res.status(400).json({ error: 'Insufficient MWAR balance' });
        }

        // 调用贡献函数
        const tx = await guildContract.contributeToGuild(
          contributionAmount,
          { gasLimit: 300000, gasPrice: ethers.parseUnits('15', 'gwei') }
        );

        await tx.wait();

        return res.status(200).json({
          success: true,
          txHash: tx.hash,
          message: 'Contribution successful'
        });

      } catch (contractError: any) {
        console.error('Contract error:', contractError);
        return res.status(400).json({ 
          error: contractError.message || 'Failed to contribute to guild'
        });
      }
    }

    if (action === 'getPlayerGuild') {
      if (!player) {
        return res.status(400).json({ error: 'Missing player address' });
      }

      // 检查公会合约是否已部署
      if (!CONTRACT_ADDRESSES.GUILD_SYSTEM || CONTRACT_ADDRESSES.GUILD_SYSTEM === '0x0000000000000000000000000000000000000000') {
        return res.status(200).json({ guild: null });
      }

      try {
        // 创建公会合约实例（只读）
        const guildContract = new ethers.Contract(
          CONTRACT_ADDRESSES.GUILD_SYSTEM,
          GUILD_SYSTEM_ABI,
          provider
        );

        // 获取玩家所属的公会ID
        const playerGuildId = await guildContract.playerGuild(player);
        
        if (playerGuildId.toString() === '0') {
          return res.status(200).json({ guild: null });
        }

        // 获取公会详情
        const guild = await guildContract.guilds(playerGuildId);
        const memberInfo = await guildContract.memberInfo(player);

        return res.status(200).json({
          guild: {
            id: playerGuildId.toString(),
            name: guild.name,
            description: guild.description,
            leader: guild.leader,
            level: guild.level.toString(),
            experience: guild.experience.toString(),
            treasury: ethers.formatEther(guild.treasury),
            memberCount: guild.memberCount.toString(),
            createdAt: guild.createdAt.toString(),
            playerContribution: ethers.formatEther(memberInfo.contribution),
            isOfficer: memberInfo.isOfficer,
            joinedAt: memberInfo.joinedAt.toString()
          }
        });

      } catch (contractError: any) {
        console.error('Contract error:', contractError);
        return res.status(200).json({ guild: null });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('Guild API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
