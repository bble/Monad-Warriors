import { GameSyncManager, PlayerState, BattleState } from '@/multisynq/GameSync'

// Mock setTimeout and clearInterval for testing
jest.useFakeTimers()

describe('GameSyncManager', () => {
  let gameSyncManager: GameSyncManager

  beforeEach(() => {
    gameSyncManager = new GameSyncManager()
    jest.clearAllMocks()
  })

  afterEach(() => {
    gameSyncManager.disconnect()
    jest.clearAllTimers()
  })

  describe('Initialization', () => {
    it('should initialize with empty game state', () => {
      const gameState = gameSyncManager.getGameState()
      
      expect(gameState.players.size).toBe(0)
      expect(gameState.battles.size).toBe(0)
      expect(gameState.timestamp).toBeGreaterThan(0)
    })

    it('should connect successfully', async () => {
      const connectPromise = gameSyncManager.initialize()
      
      // Fast-forward timers to simulate connection delay
      jest.advanceTimersByTime(1000)
      
      await connectPromise
      
      expect(gameSyncManager.isConnectedToSync()).toBe(true)
    })

    it('should emit connected event on successful initialization', async () => {
      const connectedHandler = jest.fn()
      gameSyncManager.on('connected', connectedHandler)
      
      const connectPromise = gameSyncManager.initialize()
      jest.advanceTimersByTime(1000)
      await connectPromise
      
      expect(connectedHandler).toHaveBeenCalled()
    })

    it('should start sync loop after initialization', async () => {
      const connectPromise = gameSyncManager.initialize()
      jest.advanceTimersByTime(1000)
      await connectPromise
      
      // Verify sync loop is running by checking if it's called periodically
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      jest.advanceTimersByTime(5000)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Syncing game state...',
        expect.objectContaining({
          players: 0,
          battles: 0,
          timestamp: expect.any(Number),
        })
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Player Management', () => {
    beforeEach(async () => {
      const connectPromise = gameSyncManager.initialize()
      jest.advanceTimersByTime(1000)
      await connectPromise
    })

    it('should add player correctly', () => {
      const playerState: PlayerState = {
        address: '0x1234567890123456789012345678901234567890',
        heroId: 1,
        position: { x: 100, y: 200 },
        status: 'idle',
        lastUpdate: Date.now(),
      }

      const playerJoinedHandler = jest.fn()
      gameSyncManager.on('playerJoined', playerJoinedHandler)

      gameSyncManager.addPlayer(playerState)

      const gameState = gameSyncManager.getGameState()
      expect(gameState.players.size).toBe(1)
      expect(gameState.players.get(playerState.address)).toEqual(playerState)
      expect(playerJoinedHandler).toHaveBeenCalledWith({ player: playerState })
    })

    it('should update player correctly', () => {
      const playerState: PlayerState = {
        address: '0x1234567890123456789012345678901234567890',
        heroId: 1,
        position: { x: 100, y: 200 },
        status: 'idle',
        lastUpdate: Date.now(),
      }

      gameSyncManager.addPlayer(playerState)

      const playerUpdatedHandler = jest.fn()
      gameSyncManager.on('playerUpdated', playerUpdatedHandler)

      gameSyncManager.updatePlayer(playerState.address, { 
        position: { x: 300, y: 400 },
        status: 'battling'
      })

      const updatedPlayer = gameSyncManager.getGameState().players.get(playerState.address)
      expect(updatedPlayer?.position).toEqual({ x: 300, y: 400 })
      expect(updatedPlayer?.status).toBe('battling')
      expect(playerUpdatedHandler).toHaveBeenCalled()
    })

    it('should remove player correctly', () => {
      const playerState: PlayerState = {
        address: '0x1234567890123456789012345678901234567890',
        heroId: 1,
        position: { x: 100, y: 200 },
        status: 'idle',
        lastUpdate: Date.now(),
      }

      gameSyncManager.addPlayer(playerState)
      expect(gameSyncManager.getGameState().players.size).toBe(1)

      const playerLeftHandler = jest.fn()
      gameSyncManager.on('playerLeft', playerLeftHandler)

      gameSyncManager.removePlayer(playerState.address)

      expect(gameSyncManager.getGameState().players.size).toBe(0)
      expect(playerLeftHandler).toHaveBeenCalledWith({ 
        address: playerState.address, 
        player: playerState 
      })
    })

    it('should get online players correctly', () => {
      const now = Date.now()
      
      const activePlayer: PlayerState = {
        address: '0x1111111111111111111111111111111111111111',
        heroId: 1,
        position: { x: 100, y: 200 },
        status: 'idle',
        lastUpdate: now,
      }

      const inactivePlayer: PlayerState = {
        address: '0x2222222222222222222222222222222222222222',
        heroId: 2,
        position: { x: 300, y: 400 },
        status: 'idle',
        lastUpdate: now - 60000, // 1 minute ago
      }

      gameSyncManager.addPlayer(activePlayer)
      gameSyncManager.addPlayer(inactivePlayer)

      const onlinePlayers = gameSyncManager.getOnlinePlayers()
      expect(onlinePlayers).toHaveLength(1)
      expect(onlinePlayers[0].address).toBe(activePlayer.address)
    })
  })

  describe('Battle Management', () => {
    beforeEach(async () => {
      const connectPromise = gameSyncManager.initialize()
      jest.advanceTimersByTime(1000)
      await connectPromise
    })

    it('should create battle correctly', () => {
      const battleState: BattleState = {
        id: 'battle_123',
        player1: '0x1111111111111111111111111111111111111111',
        player2: '0x2222222222222222222222222222222222222222',
        hero1Id: 1,
        hero2Id: 2,
        status: 'waiting',
        currentTurn: '0x1111111111111111111111111111111111111111',
        moves: [],
        startTime: Date.now(),
      }

      const battleCreatedHandler = jest.fn()
      gameSyncManager.on('battleCreated', battleCreatedHandler)

      gameSyncManager.createBattle(battleState)

      const gameState = gameSyncManager.getGameState()
      expect(gameState.battles.size).toBe(1)
      expect(gameState.battles.get(battleState.id)).toEqual(battleState)
      expect(battleCreatedHandler).toHaveBeenCalledWith({ battle: battleState })
    })

    it('should update battle correctly', () => {
      const battleState: BattleState = {
        id: 'battle_123',
        player1: '0x1111111111111111111111111111111111111111',
        player2: '0x2222222222222222222222222222222222222222',
        hero1Id: 1,
        hero2Id: 2,
        status: 'waiting',
        currentTurn: '0x1111111111111111111111111111111111111111',
        moves: [],
        startTime: Date.now(),
      }

      gameSyncManager.createBattle(battleState)

      const battleUpdatedHandler = jest.fn()
      gameSyncManager.on('battleUpdated', battleUpdatedHandler)

      gameSyncManager.updateBattle(battleState.id, { status: 'active' })

      const updatedBattle = gameSyncManager.getGameState().battles.get(battleState.id)
      expect(updatedBattle?.status).toBe('active')
      expect(battleUpdatedHandler).toHaveBeenCalled()
    })

    it('should add battle move correctly', () => {
      const battleState: BattleState = {
        id: 'battle_123',
        player1: '0x1111111111111111111111111111111111111111',
        player2: '0x2222222222222222222222222222222222222222',
        hero1Id: 1,
        hero2Id: 2,
        status: 'active',
        currentTurn: '0x1111111111111111111111111111111111111111',
        moves: [],
        startTime: Date.now(),
      }

      gameSyncManager.createBattle(battleState)

      const battleMoveHandler = jest.fn()
      gameSyncManager.on('battleMove', battleMoveHandler)

      const move = {
        playerId: '0x1111111111111111111111111111111111111111',
        action: 'attack' as const,
        timestamp: Date.now(),
      }

      gameSyncManager.addBattleMove(battleState.id, move)

      const updatedBattle = gameSyncManager.getGameState().battles.get(battleState.id)
      expect(updatedBattle?.moves).toHaveLength(1)
      expect(updatedBattle?.moves[0]).toEqual(move)
      expect(updatedBattle?.currentTurn).toBe('0x2222222222222222222222222222222222222222')
      expect(battleMoveHandler).toHaveBeenCalled()
    })

    it('should complete battle correctly', () => {
      const battleState: BattleState = {
        id: 'battle_123',
        player1: '0x1111111111111111111111111111111111111111',
        player2: '0x2222222222222222222222222222222222222222',
        hero1Id: 1,
        hero2Id: 2,
        status: 'active',
        currentTurn: '0x1111111111111111111111111111111111111111',
        moves: [],
        startTime: Date.now(),
      }

      gameSyncManager.createBattle(battleState)

      const battleCompletedHandler = jest.fn()
      gameSyncManager.on('battleCompleted', battleCompletedHandler)

      gameSyncManager.completeBattle(battleState.id, battleState.player1)

      const updatedBattle = gameSyncManager.getGameState().battles.get(battleState.id)
      expect(updatedBattle?.status).toBe('completed')
      expect(battleCompletedHandler).toHaveBeenCalledWith({
        battleId: battleState.id,
        winner: battleState.player1,
        battle: updatedBattle,
      })
    })

    it('should get active battles correctly', () => {
      const activeBattle: BattleState = {
        id: 'battle_active',
        player1: '0x1111111111111111111111111111111111111111',
        player2: '0x2222222222222222222222222222222222222222',
        hero1Id: 1,
        hero2Id: 2,
        status: 'active',
        currentTurn: '0x1111111111111111111111111111111111111111',
        moves: [],
        startTime: Date.now(),
      }

      const completedBattle: BattleState = {
        id: 'battle_completed',
        player1: '0x3333333333333333333333333333333333333333',
        player2: '0x4444444444444444444444444444444444444444',
        hero1Id: 3,
        hero2Id: 4,
        status: 'completed',
        currentTurn: '0x3333333333333333333333333333333333333333',
        moves: [],
        startTime: Date.now(),
      }

      gameSyncManager.createBattle(activeBattle)
      gameSyncManager.createBattle(completedBattle)

      const activeBattles = gameSyncManager.getActiveBattles()
      expect(activeBattles).toHaveLength(1)
      expect(activeBattles[0].id).toBe('battle_active')
    })
  })

  describe('Matchmaking', () => {
    beforeEach(async () => {
      const connectPromise = gameSyncManager.initialize()
      jest.advanceTimersByTime(1000)
      await connectPromise
    })

    it('should find match correctly', () => {
      const player1: PlayerState = {
        address: '0x1111111111111111111111111111111111111111',
        heroId: 1,
        position: { x: 100, y: 200 },
        status: 'idle',
        lastUpdate: Date.now(),
      }

      const player2: PlayerState = {
        address: '0x2222222222222222222222222222222222222222',
        heroId: 2,
        position: { x: 300, y: 400 },
        status: 'idle',
        lastUpdate: Date.now(),
      }

      gameSyncManager.addPlayer(player1)
      gameSyncManager.addPlayer(player2)

      const match = gameSyncManager.findMatch(player1.address)
      expect(match).toBeTruthy()
      expect(match?.address).toBe(player2.address)
    })

    it('should not find match when no available players', () => {
      const player1: PlayerState = {
        address: '0x1111111111111111111111111111111111111111',
        heroId: 1,
        position: { x: 100, y: 200 },
        status: 'idle',
        lastUpdate: Date.now(),
      }

      gameSyncManager.addPlayer(player1)

      const match = gameSyncManager.findMatch(player1.address)
      expect(match).toBeNull()
    })

    it('should not match with battling players', () => {
      const player1: PlayerState = {
        address: '0x1111111111111111111111111111111111111111',
        heroId: 1,
        position: { x: 100, y: 200 },
        status: 'idle',
        lastUpdate: Date.now(),
      }

      const player2: PlayerState = {
        address: '0x2222222222222222222222222222222222222222',
        heroId: 2,
        position: { x: 300, y: 400 },
        status: 'battling',
        lastUpdate: Date.now(),
      }

      gameSyncManager.addPlayer(player1)
      gameSyncManager.addPlayer(player2)

      const match = gameSyncManager.findMatch(player1.address)
      expect(match).toBeNull()
    })
  })

  describe('Event System', () => {
    it('should handle event listeners correctly', () => {
      const handler1 = jest.fn()
      const handler2 = jest.fn()

      gameSyncManager.on('test', handler1)
      gameSyncManager.on('test', handler2)

      // Trigger event manually for testing
      gameSyncManager['emit']('test', { data: 'test' })

      expect(handler1).toHaveBeenCalledWith({ data: 'test' })
      expect(handler2).toHaveBeenCalledWith({ data: 'test' })
    })

    it('should remove event listeners correctly', () => {
      const handler = jest.fn()

      gameSyncManager.on('test', handler)
      gameSyncManager.off('test', handler)

      gameSyncManager['emit']('test', { data: 'test' })

      expect(handler).not.toHaveBeenCalled()
    })

    it('should handle errors in event listeners gracefully', () => {
      const errorHandler = jest.fn(() => {
        throw new Error('Test error')
      })
      const normalHandler = jest.fn()

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      gameSyncManager.on('test', errorHandler)
      gameSyncManager.on('test', normalHandler)

      gameSyncManager['emit']('test', { data: 'test' })

      expect(consoleSpy).toHaveBeenCalled()
      expect(normalHandler).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('Cleanup and Disconnection', () => {
    it('should disconnect correctly', async () => {
      const connectPromise = gameSyncManager.initialize()
      jest.advanceTimersByTime(1000)
      await connectPromise

      expect(gameSyncManager.isConnectedToSync()).toBe(true)

      const disconnectedHandler = jest.fn()
      gameSyncManager.on('disconnected', disconnectedHandler)

      gameSyncManager.disconnect()

      expect(gameSyncManager.isConnectedToSync()).toBe(false)
      expect(disconnectedHandler).toHaveBeenCalled()
    })

    it('should cleanup inactive players', async () => {
      const connectPromise = gameSyncManager.initialize()
      jest.advanceTimersByTime(1000)
      await connectPromise

      const oldPlayer: PlayerState = {
        address: '0x1111111111111111111111111111111111111111',
        heroId: 1,
        position: { x: 100, y: 200 },
        status: 'idle',
        lastUpdate: Date.now() - 70000, // 70 seconds ago
      }

      gameSyncManager.addPlayer(oldPlayer)

      const playerInactiveHandler = jest.fn()
      gameSyncManager.on('playerInactive', playerInactiveHandler)

      // Trigger cleanup by advancing time
      jest.advanceTimersByTime(5000)

      expect(playerInactiveHandler).toHaveBeenCalled()
      
      const updatedPlayer = gameSyncManager.getGameState().players.get(oldPlayer.address)
      expect(updatedPlayer?.status).toBe('offline')
    })
  })
})
