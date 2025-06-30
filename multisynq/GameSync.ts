/**
 * MultiSYNQ Integration for Monad Warriors
 * 实现多人在线游戏的实时同步功能
 */

export interface GameState {
  players: Map<string, PlayerState>;
  battles: Map<string, BattleState>;
  timestamp: number;
}

export interface PlayerState {
  address: string;
  heroId: number;
  position: { x: number; y: number };
  status: 'idle' | 'battling' | 'offline';
  lastUpdate: number;
}

export interface BattleState {
  id: string;
  player1: string;
  player2: string;
  hero1Id: number;
  hero2Id: number;
  status: 'waiting' | 'active' | 'completed';
  currentTurn: string;
  moves: BattleMove[];
  startTime: number;
}

export interface BattleMove {
  playerId: string;
  action: 'attack' | 'defend' | 'special';
  target?: string;
  timestamp: number;
}

export class GameSyncManager {
  private gameState: GameState;
  private eventListeners: Map<string, Function[]>;
  private syncInterval: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.gameState = {
      players: new Map(),
      battles: new Map(),
      timestamp: Date.now(),
    };
    this.eventListeners = new Map();
  }

  /**
   * 初始化同步管理器
   */
  async initialize(): Promise<void> {
    try {
      // 在实际实现中，这里会连接到MultiSYNQ服务器
      console.log('Initializing MultiSYNQ connection...');
      
      // 模拟连接延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.isConnected = true;
      this.startSyncLoop();
      
      console.log('MultiSYNQ connected successfully');
      this.emit('connected', {});
    } catch (error) {
      console.error('Failed to initialize MultiSYNQ:', error);
      throw error;
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isConnected = false;
    this.emit('disconnected', {});
  }

  /**
   * 添加玩家到游戏状态
   */
  addPlayer(playerState: PlayerState): void {
    this.gameState.players.set(playerState.address, playerState);
    this.gameState.timestamp = Date.now();
    
    this.emit('playerJoined', { player: playerState });
    this.syncState();
  }

  /**
   * 更新玩家状态
   */
  updatePlayer(address: string, updates: Partial<PlayerState>): void {
    const player = this.gameState.players.get(address);
    if (player) {
      Object.assign(player, updates, { lastUpdate: Date.now() });
      this.gameState.timestamp = Date.now();
      
      this.emit('playerUpdated', { address, player });
      this.syncState();
    }
  }

  /**
   * 移除玩家
   */
  removePlayer(address: string): void {
    const player = this.gameState.players.get(address);
    if (player) {
      this.gameState.players.delete(address);
      this.gameState.timestamp = Date.now();
      
      this.emit('playerLeft', { address, player });
      this.syncState();
    }
  }

  /**
   * 创建新战斗
   */
  createBattle(battleState: BattleState): void {
    this.gameState.battles.set(battleState.id, battleState);
    this.gameState.timestamp = Date.now();
    
    // 更新玩家状态为战斗中
    this.updatePlayer(battleState.player1, { status: 'battling' });
    this.updatePlayer(battleState.player2, { status: 'battling' });
    
    this.emit('battleCreated', { battle: battleState });
    this.syncState();
  }

  /**
   * 更新战斗状态
   */
  updateBattle(battleId: string, updates: Partial<BattleState>): void {
    const battle = this.gameState.battles.get(battleId);
    if (battle) {
      Object.assign(battle, updates);
      this.gameState.timestamp = Date.now();
      
      this.emit('battleUpdated', { battleId, battle });
      this.syncState();
    }
  }

  /**
   * 添加战斗动作
   */
  addBattleMove(battleId: string, move: BattleMove): void {
    const battle = this.gameState.battles.get(battleId);
    if (battle) {
      battle.moves.push(move);
      battle.currentTurn = battle.currentTurn === battle.player1 ? battle.player2 : battle.player1;
      this.gameState.timestamp = Date.now();
      
      this.emit('battleMove', { battleId, move, battle });
      this.syncState();
    }
  }

  /**
   * 完成战斗
   */
  completeBattle(battleId: string, winner: string): void {
    const battle = this.gameState.battles.get(battleId);
    if (battle) {
      battle.status = 'completed';
      this.gameState.timestamp = Date.now();
      
      // 更新玩家状态为空闲
      this.updatePlayer(battle.player1, { status: 'idle' });
      this.updatePlayer(battle.player2, { status: 'idle' });
      
      this.emit('battleCompleted', { battleId, winner, battle });
      this.syncState();
      
      // 5分钟后清理战斗记录
      setTimeout(() => {
        this.gameState.battles.delete(battleId);
      }, 5 * 60 * 1000);
    }
  }

  /**
   * 获取在线玩家列表
   */
  getOnlinePlayers(): PlayerState[] {
    const now = Date.now();
    const onlineThreshold = 30000; // 30秒内有活动的玩家视为在线
    
    return Array.from(this.gameState.players.values()).filter(
      player => player.status !== 'offline' && (now - player.lastUpdate) < onlineThreshold
    );
  }

  /**
   * 获取活跃战斗列表
   */
  getActiveBattles(): BattleState[] {
    return Array.from(this.gameState.battles.values()).filter(
      battle => battle.status === 'active' || battle.status === 'waiting'
    );
  }

  /**
   * 查找匹配对手
   */
  findMatch(playerAddress: string): PlayerState | null {
    const onlinePlayers = this.getOnlinePlayers();
    const availablePlayers = onlinePlayers.filter(
      player => player.address !== playerAddress && player.status === 'idle'
    );
    
    if (availablePlayers.length > 0) {
      // 简单的随机匹配，实际实现中可以考虑技能等级匹配
      const randomIndex = Math.floor(Math.random() * availablePlayers.length);
      return availablePlayers[randomIndex];
    }
    
    return null;
  }

  /**
   * 事件监听
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * 移除事件监听
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 开始同步循环
   */
  private startSyncLoop(): void {
    this.syncInterval = setInterval(() => {
      this.cleanupInactivePlayers();
      this.syncState();
    }, 5000); // 每5秒同步一次
  }

  /**
   * 清理非活跃玩家
   */
  private cleanupInactivePlayers(): void {
    const now = Date.now();
    const inactiveThreshold = 60000; // 1分钟无活动视为离线
    
    Array.from(this.gameState.players.entries()).forEach(([address, player]) => {
      if ((now - player.lastUpdate) > inactiveThreshold) {
        player.status = 'offline';
        this.emit('playerInactive', { address, player });
      }
    });
  }

  /**
   * 同步状态到服务器
   */
  private syncState(): void {
    if (!this.isConnected) return;
    
    // 在实际实现中，这里会将状态同步到MultiSYNQ服务器
    // 现在只是模拟同步
    console.log('Syncing game state...', {
      players: this.gameState.players.size,
      battles: this.gameState.battles.size,
      timestamp: this.gameState.timestamp,
    });
  }

  /**
   * 获取连接状态
   */
  isConnectedToSync(): boolean {
    return this.isConnected;
  }

  /**
   * 获取当前游戏状态
   */
  getGameState(): GameState {
    return { ...this.gameState };
  }
}

// 单例实例
export const gameSyncManager = new GameSyncManager();
