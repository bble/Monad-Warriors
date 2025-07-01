/**
 * Netlify适配的游戏同步管理器
 * 使用HTTP API替代WebSocket，适用于静态托管环境
 */

import { GameState, PlayerState, BattleState, BattleMove } from './GameSync';

export class NetlifyGameSyncManager {
  private gameState: GameState;
  private eventListeners: Map<string, Function[]>;
  private syncInterval: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private apiUrl: string;
  private pollInterval: number = 2000; // 2秒轮询一次

  constructor() {
    this.gameState = {
      players: new Map(),
      battles: new Map(),
      timestamp: Date.now(),
    };
    this.eventListeners = new Map();
    
    // 根据环境确定API URL
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname.includes('netlify.app') || hostname.includes('netlify.com')) {
        this.apiUrl = `${window.location.origin}/.netlify/functions/game-sync`;
      } else {
        this.apiUrl = `${window.location.origin}/.netlify/functions/game-sync`;
      }
    } else {
      this.apiUrl = '/.netlify/functions/game-sync';
    }
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
      reconnectAttempts: 0
    };
  }

  /**
   * 初始化同步管理器
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Netlify Game Sync...');
      await this.fetchGameState();

      // 初始连接后，强制触发所有现有玩家的playerJoined事件
      this.syncExistingPlayers();

      this.startPolling();
      this.isConnected = true;
      console.log('✅ Netlify Game Sync connected successfully');
      this.emit('connected', {});
    } catch (error) {
      console.error('❌ Failed to initialize Netlify Game Sync:', error);
      throw error;
    }
  }

  /**
   * 同步现有玩家状态
   */
  private syncExistingPlayers(): void {
    console.log(`🔄 Syncing ${this.gameState.players.size} existing players...`);
    Array.from(this.gameState.players.entries()).forEach(([address, player]) => {
      this.emit('playerJoined', { player });
      console.log(`👤 Synced existing player: ${address}`);
    });
  }

  /**
   * 获取游戏状态
   */
  private async fetchGameState(): Promise<void> {
    try {
      console.log(`📡 Fetching game state from: ${this.apiUrl}`);
      const response = await fetch(this.apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`📡 Fetch response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Fetch error response:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Fetch response data: ${result.data?.players?.length || 0} players, ${result.data?.battles?.length || 0} battles`);

      if (result.success) {
        this.updateGameState(result.data);
      } else {
        console.error('❌ Fetch response indicates failure:', result);
      }
    } catch (error) {
      console.error('❌ Failed to fetch game state:', error);
      throw error;
    }
  }

  /**
   * 发送API请求
   */
  private async sendApiRequest(action: string, payload: any): Promise<any> {
    const requestData = { action, payload };
    console.log(`🌐 Sending API request to ${this.apiUrl}:`, requestData);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log(`📡 API response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API error response:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ API response data:`, result);

      if (result.success && result.data) {
        this.updateGameState(result.data);
      }
      return result;
    } catch (error) {
      console.error('❌ API request failed:', error);
      throw error;
    }
  }

  /**
   * 更新本地游戏状态
   */
  private updateGameState(data: any): void {
    const oldPlayers = new Map(this.gameState.players);
    const oldBattles = new Map(this.gameState.battles);

    console.log(`🔄 Updating game state: ${data.players?.length || 0} players, ${data.battles?.length || 0} battles`);

    // 防护机制：如果服务器返回空数据，可能是临时状态，不要清除现有玩家
    if (!data.players || data.players.length === 0) {
      console.log('⚠️ Server returned empty player data, skipping player state update to prevent false "playerLeft" events');

      // 只更新战斗状态，保持玩家状态不变
      if (data.battles) {
        this.gameState.battles.clear();
        data.battles.forEach((battle: BattleState) => {
          this.gameState.battles.set(battle.id, battle);
        });

        // 只检测战斗变化
        this.detectBattleChangesOnly(oldBattles);
      }
      return;
    }

    // 更新玩家状态 - 只有当服务器返回有效玩家数据时
    this.gameState.players.clear();
    data.players.forEach((player: PlayerState) => {
      this.gameState.players.set(player.address, player);
      console.log(`👤 Player: ${player.address.slice(0,6)}...${player.address.slice(-4)} (${player.status})`);
    });

    // 更新战斗状态
    this.gameState.battles.clear();
    if (data.battles) {
      data.battles.forEach((battle: BattleState) => {
        this.gameState.battles.set(battle.id, battle);
      });
    }

    this.gameState.timestamp = data.timestamp || Date.now();

    // 检测变化并触发事件
    this.detectAndEmitChanges(oldPlayers, oldBattles);
  }

  /**
   * 只检测战斗变化（当玩家数据不可靠时使用）
   */
  private detectBattleChangesOnly(oldBattles: Map<string, BattleState>): void {
    // 检测新的战斗
    Array.from(this.gameState.battles.entries()).forEach(([battleId, battle]) => {
      if (!oldBattles.has(battleId)) {
        this.emit('battleCreated', { battleId, battle });
        console.log(`⚔️ Battle created: ${battleId}`);
      } else {
        const oldBattle = oldBattles.get(battleId);
        if (oldBattle && oldBattle.moves.length !== battle.moves.length) {
          this.emit('battleUpdated', { battleId, battle });
          console.log(`🔄 Battle updated: ${battleId}`);
        }
      }
    });

    // 检测完成的战斗
    Array.from(oldBattles.keys()).forEach(battleId => {
      if (!this.gameState.battles.has(battleId)) {
        const oldBattle = oldBattles.get(battleId);
        if (oldBattle) {
          this.emit('battleCompleted', { battleId, battle: oldBattle });
          console.log(`🏁 Battle completed: ${battleId}`);
        }
      }
    });
  }

  /**
   * 检测变化并触发相应事件
   */
  private detectAndEmitChanges(oldPlayers: Map<string, PlayerState>, oldBattles: Map<string, BattleState>): void {
    // 检测新加入的玩家
    Array.from(this.gameState.players.entries()).forEach(([address, player]) => {
      if (!oldPlayers.has(address)) {
        this.emit('playerJoined', { player });
        console.log(`🎮 Emitting playerJoined event for: ${address}`);
      } else {
        // 检测玩家状态更新
        const oldPlayer = oldPlayers.get(address);
        if (oldPlayer && (oldPlayer.status !== player.status || oldPlayer.heroId !== player.heroId)) {
          this.emit('playerUpdated', { address, player });
          console.log(`🔄 Emitting playerUpdated event for: ${address} (${oldPlayer.status} -> ${player.status})`);
        }
      }
    });

    // 检测离开的玩家 - 但不要触发当前正在创建战斗的玩家的离开事件
    Array.from(oldPlayers.keys()).forEach(address => {
      if (!this.gameState.players.has(address)) {
        // 额外检查：如果这个玩家参与了新创建的战斗，不要触发离开事件
        const isInNewBattle = Array.from(this.gameState.battles.values()).some(battle =>
          battle.player1 === address || battle.player2 === address
        );

        if (!isInNewBattle) {
          this.emit('playerLeft', { address });
          console.log(`🚪 Emitting playerLeft event for: ${address}`);
        } else {
          console.log(`⚔️ Player ${address} is in a new battle, not emitting playerLeft event`);
        }
      }
    });

    // 检测新的战斗
    Array.from(this.gameState.battles.entries()).forEach(([battleId, battle]) => {
      if (!oldBattles.has(battleId)) {
        this.emit('battleCreated', { battleId, battle });
      } else {
        const oldBattle = oldBattles.get(battleId);
        if (oldBattle && oldBattle.moves.length !== battle.moves.length) {
          this.emit('battleUpdated', { battleId, battle });
        }
      }
    });
  }

  /**
   * 开始轮询
   */
  private startPolling(): void {
    console.log(`🔄 Starting polling every ${this.pollInterval}ms`);
    this.syncInterval = setInterval(async () => {
      try {
        console.log('🔄 Polling for game state updates...');
        await this.fetchGameState();
      } catch (error) {
        console.error('❌ Polling error:', error);
      }
    }, this.pollInterval);
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
    console.log('🔌 Netlify Game Sync disconnected');
  }

  /**
   * 添加玩家
   */
  async addPlayer(playerState: PlayerState): Promise<void> {
    console.log(`🎮 Adding player to Netlify API: ${playerState.address} with hero ${playerState.heroId}`);

    // 立即添加到本地状态
    this.gameState.players.set(playerState.address, playerState);
    this.emit('playerJoined', { player: playerState });
    console.log('🎮 Player added to local state:', playerState.address);

    // 发送API请求到服务器
    const result = await this.sendApiRequest('join', {
      address: playerState.address,
      heroId: playerState.heroId
    });
    console.log('✅ Player added via Netlify API:', playerState.address, result);
  }

  /**
   * 移除玩家
   */
  async removePlayer(address: string): Promise<void> {
    // 立即从本地状态中移除玩家
    const removedPlayer = this.gameState.players.get(address);
    if (removedPlayer) {
      this.gameState.players.delete(address);
      this.emit('playerLeft', { address });
      console.log('🚪 Player removed from local state:', address);
    }

    // 发送API请求到服务器
    await this.sendApiRequest('leave', { address });
    console.log('✅ Player removed via Netlify API:', address);
  }

  /**
   * 更新玩家状态
   */
  async updatePlayer(address: string, updates: Partial<PlayerState>): Promise<void> {
    await this.sendApiRequest('update', { address, updates });
  }

  /**
   * 创建战斗
   */
  async createBattle(player1: string, player2: string, hero1Id: number, hero2Id: number): Promise<string> {
    const result = await this.sendApiRequest('create-battle', {
      player1,
      player2,
      hero1Id,
      hero2Id
    });
    return result.data.battleId;
  }

  /**
   * 执行战斗动作
   */
  async makeBattleMove(battleId: string, action: 'attack' | 'defend' | 'special'): Promise<void> {
    await this.sendApiRequest('battle-move', { battleId, action });
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
   * 获取在线玩家
   */
  getOnlinePlayers(): PlayerState[] {
    return Array.from(this.gameState.players.values()).filter(
      player => player.status !== 'offline'
    );
  }

  /**
   * 获取活跃战斗
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
      const randomIndex = Math.floor(Math.random() * availablePlayers.length);
      return availablePlayers[randomIndex];
    }
    
    return null;
  }

  /**
   * 检查是否连接
   */
  isConnectedToSync(): boolean {
    return this.isConnected;
  }
}

// 单例实例
export const netlifyGameSyncManager = new NetlifyGameSyncManager();
