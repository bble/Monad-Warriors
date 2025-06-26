import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { 
  gameSyncManager, 
  PlayerState, 
  BattleState, 
  BattleMove 
} from '../multisynq/GameSync';

export interface UseGameSyncReturn {
  isConnected: boolean;
  onlinePlayers: PlayerState[];
  activeBattles: BattleState[];
  currentBattle: BattleState | null;
  playerState: PlayerState | null;
  
  // Actions
  joinGame: (heroId: number) => void;
  leaveGame: () => void;
  updatePosition: (x: number, y: number) => void;
  findMatch: () => PlayerState | null;
  createBattle: (opponentAddress: string, opponentHeroId: number) => string;
  makeBattleMove: (battleId: string, action: 'attack' | 'defend' | 'special', target?: string) => void;
  
  // Connection
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useGameSync(): UseGameSyncReturn {
  const { address } = useAccount();
  const [isConnected, setIsConnected] = useState(false);
  const [onlinePlayers, setOnlinePlayers] = useState<PlayerState[]>([]);
  const [activeBattles, setActiveBattles] = useState<BattleState[]>([]);
  const [currentBattle, setCurrentBattle] = useState<BattleState | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);

  // 连接到游戏同步服务
  const connect = useCallback(async () => {
    try {
      await gameSyncManager.initialize();
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect to game sync:', error);
      setIsConnected(false);
    }
  }, []);

  // 断开连接
  const disconnect = useCallback(() => {
    gameSyncManager.disconnect();
    setIsConnected(false);
    setPlayerState(null);
    setCurrentBattle(null);
  }, []);

  // 加入游戏
  const joinGame = useCallback((heroId: number) => {
    if (!address) return;
    
    const newPlayerState: PlayerState = {
      address,
      heroId,
      position: { x: Math.random() * 1000, y: Math.random() * 1000 },
      status: 'idle',
      lastUpdate: Date.now(),
    };
    
    gameSyncManager.addPlayer(newPlayerState);
    setPlayerState(newPlayerState);
  }, [address]);

  // 离开游戏
  const leaveGame = useCallback(() => {
    if (!address) return;
    
    gameSyncManager.removePlayer(address);
    setPlayerState(null);
    setCurrentBattle(null);
  }, [address]);

  // 更新位置
  const updatePosition = useCallback((x: number, y: number) => {
    if (!address) return;
    
    gameSyncManager.updatePlayer(address, { position: { x, y } });
    setPlayerState(prev => prev ? { ...prev, position: { x, y } } : null);
  }, [address]);

  // 寻找匹配
  const findMatch = useCallback((): PlayerState | null => {
    if (!address) return null;
    return gameSyncManager.findMatch(address);
  }, [address]);

  // 创建战斗
  const createBattle = useCallback((opponentAddress: string, opponentHeroId: number): string => {
    if (!address || !playerState) return '';
    
    const battleId = `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newBattle: BattleState = {
      id: battleId,
      player1: address,
      player2: opponentAddress,
      hero1Id: playerState.heroId,
      hero2Id: opponentHeroId,
      status: 'waiting',
      currentTurn: address, // 创建者先手
      moves: [],
      startTime: Date.now(),
    };
    
    gameSyncManager.createBattle(newBattle);
    setCurrentBattle(newBattle);
    
    return battleId;
  }, [address, playerState]);

  // 执行战斗动作
  const makeBattleMove = useCallback((
    battleId: string, 
    action: 'attack' | 'defend' | 'special', 
    target?: string
  ) => {
    if (!address) return;
    
    const move: BattleMove = {
      playerId: address,
      action,
      target,
      timestamp: Date.now(),
    };
    
    gameSyncManager.addBattleMove(battleId, move);
  }, [address]);

  // 设置事件监听器
  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setPlayerState(null);
      setCurrentBattle(null);
    };

    const handlePlayerJoined = ({ player }: { player: PlayerState }) => {
      setOnlinePlayers(prev => {
        const filtered = prev.filter(p => p.address !== player.address);
        return [...filtered, player];
      });
    };

    const handlePlayerLeft = ({ address: leftAddress }: { address: string }) => {
      setOnlinePlayers(prev => prev.filter(p => p.address !== leftAddress));
    };

    const handlePlayerUpdated = ({ address: updatedAddress, player }: { address: string, player: PlayerState }) => {
      setOnlinePlayers(prev => {
        const filtered = prev.filter(p => p.address !== updatedAddress);
        return [...filtered, player];
      });
      
      if (updatedAddress === address) {
        setPlayerState(player);
      }
    };

    const handleBattleCreated = ({ battle }: { battle: BattleState }) => {
      setActiveBattles(prev => [...prev, battle]);
      
      if (address && (battle.player1 === address || battle.player2 === address)) {
        setCurrentBattle(battle);
      }
    };

    const handleBattleUpdated = ({ battle }: { battle: BattleState }) => {
      setActiveBattles(prev => 
        prev.map(b => b.id === battle.id ? battle : b)
      );
      
      if (address && (battle.player1 === address || battle.player2 === address)) {
        setCurrentBattle(battle);
      }
    };

    const handleBattleCompleted = ({ battleId, battle }: { battleId: string, battle: BattleState }) => {
      setActiveBattles(prev => prev.filter(b => b.id !== battleId));
      
      if (address && (battle.player1 === address || battle.player2 === address)) {
        setCurrentBattle(null);
      }
    };

    const handleBattleMove = ({ battle }: { battle: BattleState }) => {
      if (address && (battle.player1 === address || battle.player2 === address)) {
        setCurrentBattle(battle);
      }
    };

    // 注册事件监听器
    gameSyncManager.on('connected', handleConnected);
    gameSyncManager.on('disconnected', handleDisconnected);
    gameSyncManager.on('playerJoined', handlePlayerJoined);
    gameSyncManager.on('playerLeft', handlePlayerLeft);
    gameSyncManager.on('playerUpdated', handlePlayerUpdated);
    gameSyncManager.on('battleCreated', handleBattleCreated);
    gameSyncManager.on('battleUpdated', handleBattleUpdated);
    gameSyncManager.on('battleCompleted', handleBattleCompleted);
    gameSyncManager.on('battleMove', handleBattleMove);

    // 清理函数
    return () => {
      gameSyncManager.off('connected', handleConnected);
      gameSyncManager.off('disconnected', handleDisconnected);
      gameSyncManager.off('playerJoined', handlePlayerJoined);
      gameSyncManager.off('playerLeft', handlePlayerLeft);
      gameSyncManager.off('playerUpdated', handlePlayerUpdated);
      gameSyncManager.off('battleCreated', handleBattleCreated);
      gameSyncManager.off('battleUpdated', handleBattleUpdated);
      gameSyncManager.off('battleCompleted', handleBattleCompleted);
      gameSyncManager.off('battleMove', handleBattleMove);
    };
  }, [address]);

  // 定期更新在线玩家和活跃战斗
  useEffect(() => {
    if (!isConnected) return;

    const updateInterval = setInterval(() => {
      setOnlinePlayers(gameSyncManager.getOnlinePlayers());
      setActiveBattles(gameSyncManager.getActiveBattles());
    }, 2000);

    return () => clearInterval(updateInterval);
  }, [isConnected]);

  // 自动连接
  useEffect(() => {
    if (address && !isConnected) {
      connect();
    }
  }, [address, isConnected, connect]);

  return {
    isConnected,
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
