/**
 * MultiSYNQ Integration for Monad Warriors
 * 实现多人在线游戏的实时同步功能
 * 使用WebSocket进行真正的跨浏览器实时同步
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
  player1Hp?: number;
  player2Hp?: number;
  maxHp?: number;
  winner?: string;
  reward?: number;
  battleLog?: string[];
}

export interface BattleMove {
  playerId: string;
  action: 'attack' | 'defend' | 'special';
  target?: string;
  timestamp: number;
  damage?: number;
  description?: string;
}

export class GameSyncManager {
  private gameState: GameState;
  private eventListeners: Map<string, Function[]>;
  private syncInterval: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private websocket: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private messageQueue: Array<{ type: string; data: any }> = [];
  private performanceMetrics = {
    messagesSent: 0,
    messagesReceived: 0,
    reconnections: 0,
    lastLatency: 0,
    averageLatency: 0,
    latencyHistory: [] as number[]
  };

  constructor() {
    this.gameState = {
      players: new Map(),
      battles: new Map(),
      timestamp: Date.now(),
    };
    this.eventListeners = new Map();
  }

  /**
   * 获取当前游戏状态
   */
  getGameState(): GameState {
    return { ...this.gameState };
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): { isConnected: boolean; reconnectAttempts: number } {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      queuedMessages: this.messageQueue.length
    };
  }

  /**
   * 初始化同步管理器
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing WebSocket MultiSYNQ connection...');
      await this.connectWebSocket();
      this.startSyncLoop();
      console.log('✅ WebSocket MultiSYNQ connected successfully');
      this.emit('connected', {});
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket MultiSYNQ:', error);
      throw error;
    }
  }

  /**
   * 连接WebSocket服务器
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 动态获取主机名，支持IP访问
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const wsUrl = `ws://${hostname}:8080`;
        console.log('🔗 Connecting to WebSocket:', wsUrl);
        this.websocket = new WebSocket(wsUrl);

        this.websocket.onopen = () => {
          console.log('✅ WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.processMessageQueue();
          resolve();
        };

        this.websocket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleWebSocketMessage(message);
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };

        this.websocket.onclose = () => {
          console.log('🔌 WebSocket disconnected');
          this.isConnected = false;
          this.attemptReconnect();
        };

        this.websocket.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(error);
        };

        // 超时处理
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 5000);

      } catch (error) {
        reject(error);
      }
    });
  }



  /**
   * 处理WebSocket消息
   */
  private handleWebSocketMessage(message: any): void {
    const { type, data } = message;
    this.performanceMetrics.messagesReceived++;
    console.log('📡 Received WebSocket message:', type, data);

    switch (type) {
      case 'connected':
        console.log('🎯 WebSocket server confirmed connection:', data.clientId);
        break;

      case 'pong':
        const latency = Date.now() - data.timestamp;
        this.performanceMetrics.lastLatency = latency;
        this.performanceMetrics.latencyHistory.push(latency);

        // 保持最近10次延迟记录
        if (this.performanceMetrics.latencyHistory.length > 10) {
          this.performanceMetrics.latencyHistory.shift();
        }

        // 计算平均延迟
        this.performanceMetrics.averageLatency =
          this.performanceMetrics.latencyHistory.reduce((a, b) => a + b, 0) /
          this.performanceMetrics.latencyHistory.length;

        console.log(`💓 Heartbeat: ${latency}ms (avg: ${Math.round(this.performanceMetrics.averageLatency)}ms)`);
        break;

      case 'error':
        console.error('❌ Server error:', data.message);
        this.emit('error', { error: data.message, timestamp: data.timestamp });
        break;

      case 'player-joined':
        if (!this.gameState.players.has(data.player.address)) {
          this.gameState.players.set(data.player.address, data.player);
          this.emit('playerJoined', { player: data.player });
          console.log('✅ Player joined from WebSocket:', data.player.address);
        }
        break;

      case 'player-updated':
        if (this.gameState.players.has(data.address)) {
          this.gameState.players.set(data.address, data.player);
          this.emit('playerUpdated', { address: data.address, player: data.player });
          console.log('✅ Player updated from WebSocket:', data.address);
        }
        break;

      case 'player-left':
        if (this.gameState.players.has(data.address)) {
          this.gameState.players.delete(data.address);
          this.emit('playerLeft', { address: data.address });
          console.log('✅ Player left from WebSocket:', data.address);
        }
        break;

      case 'battle-created':
        if (!this.gameState.battles.has(data.battle.id)) {
          this.gameState.battles.set(data.battle.id, data.battle);
          this.emit('battleCreated', { battle: data.battle });
          console.log('✅ Battle created from WebSocket:', data.battle.id);
        }
        break;

      case 'battle-updated':
        if (this.gameState.battles.has(data.battleId)) {
          this.gameState.battles.set(data.battleId, data.battle);
          this.emit('battleUpdated', { battleId: data.battleId, battle: data.battle });
          console.log('✅ Battle updated from WebSocket:', data.battleId);
        }
        break;

      case 'game-state':
        // 同步完整游戏状态
        this.gameState.players.clear();
        this.gameState.battles.clear();

        data.players.forEach((player: PlayerState) => {
          this.gameState.players.set(player.address, player);
        });

        data.battles.forEach((battle: BattleState) => {
          this.gameState.battles.set(battle.id, battle);
        });

        console.log('🔄 Game state synchronized from WebSocket');
        this.emit('gameStateSynced', { gameState: this.gameState });
        break;

      default:
        console.log('❓ Unknown WebSocket message type:', type);
    }
  }

  /**
   * 尝试重连WebSocket
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit('connectionFailed', {});
      return;
    }

    this.reconnectAttempts++;
    this.performanceMetrics.reconnections++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);

    setTimeout(() => {
      this.connectWebSocket().catch((error) => {
        console.error('❌ Reconnection failed:', error);
        this.attemptReconnect();
      });
    }, delay);
  }

  /**
   * 发送WebSocket消息
   */
  private sendWebSocketMessage(type: string, data: any): void {
    const message = { type, data };

    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
      this.performanceMetrics.messagesSent++;
      console.log('📤 Sent WebSocket message:', type, data);
    } else {
      // 将消息添加到队列中，等待重连后发送
      this.messageQueue.push(message);
      console.warn('⚠️ WebSocket not connected, message queued:', type);

      // 限制队列大小
      if (this.messageQueue.length > 100) {
        this.messageQueue.shift(); // 移除最旧的消息
        console.warn('⚠️ Message queue full, removed oldest message');
      }
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

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.isConnected = false;
    this.emit('disconnected', {});
    console.log('🔌 WebSocket MultiSYNQ disconnected');
  }

  /**
   * 添加玩家到游戏状态
   */
  addPlayer(playerState: PlayerState): void {
    this.gameState.players.set(playerState.address, playerState);
    this.gameState.timestamp = Date.now();

    this.emit('playerJoined', { player: playerState });

    // 通过WebSocket广播到其他客户端
    this.sendWebSocketMessage('player-joined', { player: playerState });

    console.log('✅ Player added via WebSocket:', playerState.address);
  }

  /**
   * 更新玩家状态
   */
  updatePlayer(address: string, updates: Partial<PlayerState>): void {
    const player = this.gameState.players.get(address);
    if (player) {
      const updatedPlayer = { ...player, ...updates, lastUpdate: Date.now() };
      this.gameState.players.set(address, updatedPlayer);
      this.gameState.timestamp = Date.now();

      this.emit('playerUpdated', { address, player: updatedPlayer });

      // 通过WebSocket广播到其他客户端
      this.sendWebSocketMessage('player-updated', { address, player: updatedPlayer });

      console.log('✅ Player updated via WebSocket:', address);
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

      // 通过WebSocket广播到其他客户端
      this.sendWebSocketMessage('player-left', { address, player });

      console.log('✅ Player removed via WebSocket:', address);
    }
  }

  /**
   * 创建新战斗
   */
  createBattle(battleState: BattleState): void {
    // 初始化战斗HP
    const maxHp = 100;
    const battleWithHp = {
      ...battleState,
      player1Hp: maxHp,
      player2Hp: maxHp,
      maxHp: maxHp,
      battleLog: [`🏟️ Battle begins! ${battleState.player1.slice(0,6)}...${battleState.player1.slice(-4)} vs ${battleState.player2.slice(0,6)}...${battleState.player2.slice(-4)}`]
    };

    this.gameState.battles.set(battleState.id, battleWithHp);
    this.gameState.timestamp = Date.now();

    // 更新玩家状态为战斗中
    this.updatePlayer(battleState.player1, { status: 'battling' });
    this.updatePlayer(battleState.player2, { status: 'battling' });

    this.emit('battleCreated', { battle: battleWithHp });

    // 通过WebSocket广播到其他客户端
    this.sendWebSocketMessage('battle-created', { battle: battleWithHp });

    console.log('✅ Battle created via WebSocket:', battleState.id);
  }

  /**
   * 更新战斗状态
   */
  updateBattle(battleId: string, updates: Partial<BattleState>): void {
    const battle = this.gameState.battles.get(battleId);
    if (battle) {
      const updatedBattle = { ...battle, ...updates };
      this.gameState.battles.set(battleId, updatedBattle);
      this.gameState.timestamp = Date.now();

      this.emit('battleUpdated', { battleId, battle: updatedBattle });

      // 通过WebSocket广播到其他客户端
      this.sendWebSocketMessage('battle-updated', { battleId, battle: updatedBattle });

      console.log('✅ Battle updated via WebSocket:', battleId);
    }
  }

  /**
   * 添加战斗动作
   */
  addBattleMove(battleId: string, move: BattleMove): void {
    const battle = this.gameState.battles.get(battleId);
    if (battle && battle.status === 'active') {
      // 计算伤害
      const damage = this.calculateDamage(move.action);
      const moveWithDamage = {
        ...move,
        damage,
        description: this.getActionDescription(move.action, damage)
      };

      // 更新HP
      let player1Hp = battle.player1Hp || 100;
      let player2Hp = battle.player2Hp || 100;

      if (move.playerId === battle.player1) {
        // Player1攻击Player2
        if (move.action !== 'defend') {
          player2Hp = Math.max(0, player2Hp - damage);
        }
      } else {
        // Player2攻击Player1
        if (move.action !== 'defend') {
          player1Hp = Math.max(0, player1Hp - damage);
        }
      }

      // 更新战斗日志
      const battleLog = battle.battleLog || [];
      const playerName = move.playerId === battle.player1 ? 'Player 1' : 'Player 2';
      battleLog.push(`⚔️ ${playerName} ${moveWithDamage.description}`);

      // 检查胜负
      let winner: string | undefined;
      let status: 'waiting' | 'active' | 'completed' = battle.status;
      let reward = 0;

      if (player1Hp <= 0 && player2Hp <= 0) {
        winner = 'draw';
        status = 'completed';
        reward = 5;
        battleLog.push('🤝 Battle ends in a draw!');
      } else if (player1Hp <= 0) {
        winner = battle.player2;
        status = 'completed';
        reward = 10;
        battleLog.push(`🏆 Player 2 wins!`);
      } else if (player2Hp <= 0) {
        winner = battle.player1;
        status = 'completed';
        reward = 10;
        battleLog.push(`🏆 Player 1 wins!`);
      }

      const updatedBattle = {
        ...battle,
        moves: [...battle.moves, moveWithDamage],
        currentTurn: battle.currentTurn === battle.player1 ? battle.player2 : battle.player1,
        player1Hp,
        player2Hp,
        battleLog,
        status,
        winner,
        reward
      };

      this.gameState.battles.set(battleId, updatedBattle);
      this.gameState.timestamp = Date.now();

      this.emit('battleMove', { battleId, move: moveWithDamage, battle: updatedBattle });

      // 如果战斗结束，触发完成事件
      if (status === 'completed') {
        this.emit('battleCompleted', { battleId, winner: winner!, battle: updatedBattle });

        // 更新玩家状态为空闲
        this.updatePlayer(battle.player1, { status: 'idle' });
        this.updatePlayer(battle.player2, { status: 'idle' });
      }

      // 通过WebSocket广播到其他客户端
      this.sendWebSocketMessage('battle-updated', { battleId, battle: updatedBattle });

      console.log('✅ Battle move added via WebSocket:', battleId);
    }
  }

  /**
   * 计算伤害
   */
  private calculateDamage(action: 'attack' | 'defend' | 'special'): number {
    switch (action) {
      case 'attack':
        return 15 + Math.floor(Math.random() * 10); // 15-25伤害
      case 'special':
        return 20 + Math.floor(Math.random() * 15); // 20-35伤害
      case 'defend':
        return 0; // 防御不造成伤害
      default:
        return 10;
    }
  }

  /**
   * 获取动作描述
   */
  private getActionDescription(action: 'attack' | 'defend' | 'special', damage: number): string {
    switch (action) {
      case 'attack':
        return `attacks for ${damage} damage!`;
      case 'special':
        return `uses special attack for ${damage} damage!`;
      case 'defend':
        return `defends and reduces incoming damage!`;
      default:
        return `performs unknown action for ${damage} damage!`;
    }
  }

  /**
   * 完成战斗
   */
  completeBattle(battleId: string, winner: string): void {
    const battle = this.gameState.battles.get(battleId);
    if (battle) {
      const updatedBattle = { ...battle, status: 'completed' as const };
      this.gameState.battles.set(battleId, updatedBattle);
      this.gameState.timestamp = Date.now();

      // 更新玩家状态为空闲
      this.updatePlayer(battle.player1, { status: 'idle' });
      this.updatePlayer(battle.player2, { status: 'idle' });

      this.emit('battleCompleted', { battleId, winner, battle: updatedBattle });

      // 通过WebSocket广播到其他客户端
      this.sendWebSocketMessage('battle-updated', { battleId, battle: updatedBattle });

      console.log('✅ Battle completed via WebSocket:', battleId);

      // 5分钟后清理战斗记录
      setTimeout(() => {
        this.gameState.battles.delete(battleId);
        this.gameState.timestamp = Date.now();
      }, 5 * 60 * 1000);
    }
  }

  /**
   * 获取在线玩家列表
   */
  getOnlinePlayers(): PlayerState[] {
    const now = Date.now();
    const onlineThreshold = 60000; // 60秒内有活动的玩家视为在线

    const allPlayers = Array.from(this.gameState.players.values());
    const onlinePlayers = allPlayers.filter(
      player => player.status !== 'offline' && (now - player.lastUpdate) < onlineThreshold
    );

    console.log('🔍 getOnlinePlayers:', {
      total: allPlayers.length,
      online: onlinePlayers.length,
      threshold: onlineThreshold,
      now: now,
      players: allPlayers.map(p => ({
        address: p.address.slice(0, 10) + '...',
        status: p.status,
        lastUpdate: p.lastUpdate,
        timeDiff: now - p.lastUpdate,
        isOnline: p.status !== 'offline' && (now - p.lastUpdate) < onlineThreshold
      }))
    });

    return onlinePlayers;
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
      this.sendHeartbeat();
    }, 5000); // 每5秒清理一次非活跃玩家并发送心跳
  }

  /**
   * 发送心跳包
   */
  private sendHeartbeat(): void {
    if (this.isConnected) {
      this.sendWebSocketMessage('ping', { timestamp: Date.now() });
    }
  }

  /**
   * 处理消息队列
   */
  private processMessageQueue(): void {
    if (!this.isConnected || this.messageQueue.length === 0) return;

    console.log(`📤 Processing ${this.messageQueue.length} queued messages`);

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    messages.forEach(message => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify(message));
        console.log('📤 Sent queued message:', message.type);
      } else {
        // 如果连接断开，重新加入队列
        this.messageQueue.push(message);
      }
    });
  }

  /**
   * 清理非活跃玩家
   */
  private cleanupInactivePlayers(): void {
    const now = Date.now();
    const inactiveThreshold = 60000; // 1分钟无活动视为离线

    Array.from(this.gameState.players.entries()).forEach(([address, player]) => {
      if ((now - player.lastUpdate) > inactiveThreshold && player.status !== 'offline') {
        this.updatePlayer(address, { status: 'offline' });
        this.emit('playerInactive', { address, player });
        console.log('🧹 Player marked as inactive:', address);
      }
    });
  }

  /**
   * 获取连接状态
   */
  isConnectedToSync(): boolean {
    return this.isConnected;
  }
}

// 单例实例
export const gameSyncManager = new GameSyncManager();
