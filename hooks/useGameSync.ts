import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import {
  PlayerState,
  BattleState,
  BattleMove
} from '../multisynq/GameSync';
import { netlifyGameSyncManager } from '../multisynq/NetlifyGameSync';
import { CONTRACT_ADDRESSES, MWAR_TOKEN_ABI } from '@/utils/contractABI';
import { parseEther } from 'viem';

export interface UseGameSyncReturn {
  isConnected: boolean;
  connectionStatus: { isConnected: boolean; reconnectAttempts: number };
  onlinePlayers: PlayerState[];
  activeBattles: BattleState[];
  currentBattle: BattleState | null;
  playerState: PlayerState | null;

  // Actions
  joinGame: (heroId: number) => Promise<void>;
  leaveGame: () => Promise<void>;
  updatePosition: (x: number, y: number) => Promise<void>;
  findMatch: () => PlayerState | null;
  createBattle: (opponentAddress: string, opponentHeroId: number) => Promise<string>;
  makeBattleMove: (battleId: string, action: 'attack' | 'defend' | 'special') => Promise<void>;

  // Connection
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useGameSync(): UseGameSyncReturn {
  const { address } = useAccount();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({ isConnected: false, reconnectAttempts: 0 });
  const [onlinePlayers, setOnlinePlayers] = useState<PlayerState[]>([]);
  const [activeBattles, setActiveBattles] = useState<BattleState[]>([]);
  const [currentBattle, setCurrentBattle] = useState<BattleState | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);

  // 根据环境选择同步管理器
  const getSyncManager = useCallback(() => {
    // 始终使用Netlify版本，因为我们已经部署到Netlify
    return netlifyGameSyncManager;
  }, []);

  // 连接到游戏同步服务
  const connect = useCallback(async () => {
    try {
      const syncManager = getSyncManager();
      await syncManager.initialize();
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect to game sync:', error);
      setIsConnected(false);
    }
  }, [getSyncManager]);

  // 断开连接
  const disconnect = useCallback(() => {
    const syncManager = getSyncManager();
    syncManager.disconnect();
    setIsConnected(false);
    setPlayerState(null);
    setCurrentBattle(null);
  }, [getSyncManager]);

  // 加入游戏
  const joinGame = useCallback(async (heroId: number) => {
    if (!address) return;

    const newPlayerState: PlayerState = {
      address,
      heroId,
      position: { x: Math.random() * 1000, y: Math.random() * 1000 },
      status: 'idle',
      lastUpdate: Date.now(),
    };

    try {
      const syncManager = getSyncManager();
      await syncManager.addPlayer(newPlayerState);
      setPlayerState(newPlayerState);
      console.log('✅ Successfully joined game:', address);
    } catch (error) {
      console.error('❌ Failed to join game:', error);
    }
  }, [address, getSyncManager]);

  // 离开游戏
  const leaveGame = useCallback(async () => {
    if (!address) return;

    try {
      console.log('🚪 Starting leave game process for:', address);

      // 立即设置playerState为null
      setPlayerState(null);
      setCurrentBattle(null);
      console.log('🚫 Set playerState to null');

      // 调用服务器移除
      const syncManager = getSyncManager();
      await syncManager.removePlayer(address);
      console.log('✅ Successfully left game:', address);
    } catch (error) {
      console.error('❌ Failed to leave game:', error);
    }
  }, [address, getSyncManager]);

  // 更新位置
  const updatePosition = useCallback(async (x: number, y: number) => {
    if (!address) return;

    try {
      const syncManager = getSyncManager();
      await syncManager.updatePlayer(address, { position: { x, y } });
      setPlayerState(prev => prev ? { ...prev, position: { x, y } } : null);
    } catch (error) {
      console.error('❌ Failed to update position:', error);
    }
  }, [address, getSyncManager]);

  // 寻找匹配
  const findMatch = useCallback((): PlayerState | null => {
    if (!address) return null;
    const syncManager = getSyncManager();
    return syncManager.findMatch(address);
  }, [address, getSyncManager]);

  // 创建战斗
  const createBattle = useCallback(async (opponentAddress: string, opponentHeroId: number): Promise<string> => {
    if (!address || !playerState) {
      return '';
    }

    const battleId = `battle_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newBattle: BattleState = {
      id: battleId,
      player1: address,
      player2: opponentAddress,
      hero1Id: playerState.heroId,
      hero2Id: opponentHeroId,
      status: 'active',
      currentTurn: address,
      moves: [],
      startTime: Date.now(),
      player1Hp: 100,
      player2Hp: 100,
      maxHp: 100
    };

    const syncManager = getSyncManager();

    // 根据同步管理器类型调用不同的方法
    if ('createBattle' in syncManager && typeof syncManager.createBattle === 'function') {
      if (syncManager === netlifyGameSyncManager) {
        // Netlify版本
        await (syncManager as any).createBattle(address, opponentAddress, playerState.heroId, opponentHeroId);
      } else {
        // WebSocket版本
        (syncManager as any).createBattle(newBattle);
      }
    }

    setCurrentBattle(newBattle);
    return battleId;
  }, [address, playerState, getSyncManager]);

  // 执行战斗动作
  const makeBattleMove = useCallback(async (
    battleId: string,
    action: 'attack' | 'defend' | 'special'
  ) => {
    if (!address) return;

    const syncManager = getSyncManager();

    // 根据同步管理器类型调用不同的方法
    if (syncManager === netlifyGameSyncManager) {
      // Netlify版本
      await (syncManager as any).makeBattleMove(battleId, action);
    } else {
      // WebSocket版本 - 创建move对象
      const move: BattleMove = {
        playerId: address,
        action,
        timestamp: Date.now(),
      };
      (syncManager as any).addBattleMove(battleId, move);
    }
  }, [address, getSyncManager]);

  // 智能合约调用
  const { writeContract, data: battleHash, isPending: isBattlePending } = useWriteContract();
  const { isLoading: isBattleLoading, isSuccess: isBattleSuccess } = useWaitForTransactionReceipt({
    hash: battleHash,
  });

  // 分发战斗奖励
  const distributeBattleRewards = useCallback(async (battle: BattleState) => {
    if (!address) return;

    try {
      // 确定是否为获胜者
      const isWinner = battle.winner === address;
      const isDraw = battle.winner === 'draw';

      let rewardAmount = 0;
      let resultText = '';
      if (isWinner) {
        rewardAmount = 10; // 10 MWAR for win
        resultText = 'Victory';
      } else if (isDraw) {
        rewardAmount = 5; // 5 MWAR for draw
        resultText = 'Draw';
      } else {
        rewardAmount = 2; // 2 MWAR for loss
        resultText = 'Defeat';
      }

      console.log(`🎁 Battle ${resultText}: +${rewardAmount} MWAR`);

      // 显示奖励通知
      if (typeof window !== 'undefined') {
        // 创建一个临时通知元素
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce';
        notification.innerHTML = `🎁 +${rewardAmount} MWAR (${resultText})`;
        document.body.appendChild(notification);

        // 3秒后移除通知
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 3000);
      }

      // 调用智能合约分发奖励
      // 使用GameCore.submitBattleResult来提交战斗结果并分发奖励
      if (battle.hero1Id && battle.hero2Id && battle.winner) {
        const opponentAddress = battle.player1 === address ? battle.player2 : battle.player1;
        const myHeroId = battle.player1 === address ? battle.hero1Id : battle.hero2Id;
        const opponentHeroId = battle.player1 === address ? battle.hero2Id : battle.hero1Id;

        // 确定战斗结果枚举值 (0=Win, 1=Lose, 2=Draw)
        let battleResult;
        if (battle.winner === 'draw') {
          battleResult = 2; // Draw
        } else if (battle.winner === address) {
          battleResult = 0; // Win
        } else {
          battleResult = 1; // Lose
        }

        console.log(`🔗 Submitting battle result to smart contract...`);
        console.log(`Result: ${battleResult} (0=Win, 1=Lose, 2=Draw), Reward: ${rewardAmount} MWAR`);

        try {
          // 调用GameCore合约的submitBattleResult函数
          await writeContract({
            address: CONTRACT_ADDRESSES.GAME_CORE as `0x${string}`,
            abi: [
              {
                "inputs": [
                  {"internalType": "uint256", "name": "myHeroId", "type": "uint256"},
                  {"internalType": "address", "name": "opponent", "type": "address"},
                  {"internalType": "uint256", "name": "opponentHeroId", "type": "uint256"},
                  {"internalType": "uint8", "name": "result", "type": "uint8"}
                ],
                "name": "submitBattleResult",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
              }
            ],
            functionName: 'submitBattleResult',
            args: [
              BigInt(myHeroId),
              opponentAddress as `0x${string}`,
              BigInt(opponentHeroId),
              battleResult
            ],
            gas: BigInt(300000), // 降低gas limit节省费用
            gasPrice: parseEther('0.000000020'), // 20 gwei gas price
          });

          console.log(`✅ Battle result submitted and rewards distributed!`);
        } catch (error) {
          console.error('❌ Failed to submit battle result:', error);
          // 即使链上调用失败，也显示本地奖励通知
        }
      }

    } catch (error) {
      console.error('❌ Failed to distribute battle rewards:', error);

      // 显示错误通知
      if (typeof window !== 'undefined') {
        const errorNotification = document.createElement('div');
        errorNotification.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        errorNotification.innerHTML = `❌ Failed to distribute rewards`;
        document.body.appendChild(errorNotification);

        setTimeout(() => {
          if (document.body.contains(errorNotification)) {
            document.body.removeChild(errorNotification);
          }
        }, 3000);
      }
    }
  }, [address, writeContract]);

  // 自动连接到MultiSYNQ
  useEffect(() => {
    let mounted = true;

    const autoConnect = async () => {
      try {
        console.log('🚀 Auto-connecting to MultiSYNQ...');
        await connect();
        if (mounted) {
          console.log('✅ Auto-connected to MultiSYNQ successfully');
        }
      } catch (error) {
        if (mounted) {
          console.error('❌ Auto-connect failed:', error);
          // 5秒后重试
          setTimeout(() => {
            if (mounted) {
              autoConnect();
            }
          }, 5000);
        }
      }
    };

    autoConnect();

    return () => {
      mounted = false;
    };
  }, [connect]);

  // 设置事件监听器
  useEffect(() => {
    const syncManager = getSyncManager();

    const handleConnected = () => {
      setIsConnected(true);
      setConnectionStatus(syncManager.getConnectionStatus());
      console.log('✅ Connected to MultiSYNQ');
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setConnectionStatus(syncManager.getConnectionStatus());
      setPlayerState(null);
      setCurrentBattle(null);
      console.log('❌ Disconnected from MultiSYNQ');
    };

    const handlePlayerJoined = ({ player }: { player: PlayerState }) => {
      console.log('🎮 handlePlayerJoined called for:', player.address);
      setOnlinePlayers(prev => {
        const filtered = prev.filter(p => p.address !== player.address);
        const newList = [...filtered, player];
        console.log(`👥 Updated online players: ${newList.length} total`);
        return newList;
      });
      console.log('✅ Player joined:', player.address);
    };

    const handlePlayerLeft = ({ address: leftAddress }: { address: string }) => {
      setOnlinePlayers(prev => {
        const newList = prev.filter(p => p.address !== leftAddress);
        return newList;
      });

      // 如果离开的是当前用户，清除playerState
      if (leftAddress === address) {
        setPlayerState(null);
        setCurrentBattle(null);
        console.log('🚪 Current user left the game');
      }

      console.log('❌ Player left:', leftAddress);
    };

    const handlePlayerUpdated = ({ address: updatedAddress, player }: { address: string, player: PlayerState }) => {
      setOnlinePlayers(prev => {
        const filtered = prev.filter(p => p.address !== updatedAddress);
        return [...filtered, player];
      });

      if (updatedAddress === address) {
        setPlayerState(player);
      }
      console.log('🔄 Player updated:', updatedAddress);
    };

    const handleBattleCreated = ({ battle }: { battle: BattleState }) => {
      setActiveBattles(prev => [...prev, battle]);

      if (address && (battle.player1 === address || battle.player2 === address)) {
        setCurrentBattle(battle);
      }
      console.log('⚔️ Battle created:', battle.id);
    };

    const handleBattleUpdated = ({ battle }: { battle: BattleState }) => {
      setActiveBattles(prev =>
        prev.map(b => b.id === battle.id ? battle : b)
      );

      if (address && (battle.player1 === address || battle.player2 === address)) {
        setCurrentBattle(battle);
      }
      console.log('🔄 Battle updated:', battle.id);
    };

    const handleBattleCompleted = ({ battleId, battle }: { battleId: string, battle: BattleState }) => {
      setActiveBattles(prev => prev.filter(b => b.id !== battleId));

      if (address && (battle.player1 === address || battle.player2 === address)) {
        // 保持战斗结果显示，不立即清除
        setCurrentBattle(battle);

        // 分发奖励
        distributeBattleRewards(battle);

        // 5秒后清除战斗结果
        setTimeout(() => {
          setCurrentBattle(null);
        }, 5000);
      }
      console.log('🏁 Battle completed:', battleId, 'Winner:', battle.winner);
    };

    const handleBattleMove = ({ battle }: { battle: BattleState }) => {
      if (address && (battle.player1 === address || battle.player2 === address)) {
        setCurrentBattle(battle);
      }
      console.log('⚡ Battle move:', battle.id);
    };

    // 注册事件监听器
    syncManager.on('connected', handleConnected);
    syncManager.on('disconnected', handleDisconnected);
    syncManager.on('playerJoined', handlePlayerJoined);
    syncManager.on('playerLeft', handlePlayerLeft);
    syncManager.on('playerUpdated', handlePlayerUpdated);
    syncManager.on('battleCreated', handleBattleCreated);
    syncManager.on('battleUpdated', handleBattleUpdated);
    syncManager.on('battleCompleted', handleBattleCompleted);
    syncManager.on('battleMove', handleBattleMove);

    // 清理函数
    return () => {
      syncManager.off('connected', handleConnected);
      syncManager.off('disconnected', handleDisconnected);
      syncManager.off('playerJoined', handlePlayerJoined);
      syncManager.off('playerLeft', handlePlayerLeft);
      syncManager.off('playerUpdated', handlePlayerUpdated);
      syncManager.off('battleCreated', handleBattleCreated);
      syncManager.off('battleUpdated', handleBattleUpdated);
      syncManager.off('battleCompleted', handleBattleCompleted);
      syncManager.off('battleMove', handleBattleMove);
    };
  }, [address, getSyncManager]);

  // 定期更新在线玩家、活跃战斗和连接状态
  useEffect(() => {
    if (!isConnected) return;

    console.log('🔄 Setting up periodic state updates...');
    const syncManager = getSyncManager();

    // 立即更新一次
    const initialPlayers = syncManager.getOnlinePlayers();
    const initialBattles = syncManager.getActiveBattles();
    console.log(`📊 Initial state: ${initialPlayers.length} players, ${initialBattles.length} battles`);

    setOnlinePlayers(initialPlayers);
    setActiveBattles(initialBattles);
    setConnectionStatus(syncManager.getConnectionStatus());

    const updateInterval = setInterval(() => {
      const currentPlayers = syncManager.getOnlinePlayers();
      const currentBattles = syncManager.getActiveBattles();
      console.log(`📊 Periodic update: ${currentPlayers.length} players, ${currentBattles.length} battles`);

      setOnlinePlayers(currentPlayers);
      setActiveBattles(currentBattles);
      setConnectionStatus(syncManager.getConnectionStatus());
    }, 2000);

    return () => clearInterval(updateInterval);
  }, [isConnected, getSyncManager]);

  // 自动心跳 - 保持玩家在线状态
  useEffect(() => {
    if (!isConnected || !address || !playerState) return;

    const syncManager = getSyncManager();
    const heartbeatInterval = setInterval(() => {
      // 更新玩家的lastUpdate时间，保持在线状态
      syncManager.updatePlayer(address, {
        lastUpdate: Date.now()
      });
      console.log('💓 Player heartbeat sent');
    }, 15000); // 每15秒发送一次心跳

    return () => clearInterval(heartbeatInterval);
  }, [isConnected, address, playerState, getSyncManager]);

  // 注意：移除了自动状态恢复逻辑，用户必须手动加入游戏

  // 自动连接
  useEffect(() => {
    if (address && !isConnected) {
      connect();
    }
  }, [address, isConnected, connect]);

  return {
    isConnected,
    connectionStatus,
    onlinePlayers,
    activeBattles,
    currentBattle,
    playerState,

    joinGame,
    leaveGame,
    updatePosition,
    findMatch,
    createBattle,
    makeBattleMove,

    connect,
    disconnect,
  };
}
