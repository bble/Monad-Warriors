import { renderHook, act } from '@testing-library/react'
import { useGameSync } from '@/hooks/useGameSync'

// Mock the GameSyncManager
const mockGameSyncManager = {
  initialize: jest.fn(),
  disconnect: jest.fn(),
  addPlayer: jest.fn(),
  removePlayer: jest.fn(),
  updatePlayer: jest.fn(),
  findMatch: jest.fn(),
  createBattle: jest.fn(),
  addBattleMove: jest.fn(),
  getOnlinePlayers: jest.fn(() => []),
  getActiveBattles: jest.fn(() => []),
  on: jest.fn(),
  off: jest.fn(),
}

jest.mock('@/multisynq/GameSync', () => ({
  gameSyncManager: mockGameSyncManager,
}))

// Mock wagmi useAccount hook
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
  })),
}))

describe('useGameSync', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useGameSync())

    expect(result.current.isConnected).toBe(false)
    expect(result.current.onlinePlayers).toEqual([])
    expect(result.current.activeBattles).toEqual([])
    expect(result.current.currentBattle).toBeNull()
    expect(result.current.playerState).toBeNull()
  })

  it('should connect automatically when address is available', async () => {
    mockGameSyncManager.initialize.mockResolvedValue(undefined)

    const { result } = renderHook(() => useGameSync())

    await act(async () => {
      await result.current.connect()
    })

    expect(mockGameSyncManager.initialize).toHaveBeenCalled()
  })

  it('should handle connection success', async () => {
    mockGameSyncManager.initialize.mockResolvedValue(undefined)

    const { result } = renderHook(() => useGameSync())

    await act(async () => {
      await result.current.connect()
    })

    // Simulate connected event
    const connectedHandler = mockGameSyncManager.on.mock.calls.find(
      call => call[0] === 'connected'
    )?.[1]

    act(() => {
      connectedHandler?.()
    })

    expect(result.current.isConnected).toBe(true)
  })

  it('should handle connection failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    mockGameSyncManager.initialize.mockRejectedValue(new Error('Connection failed'))

    const { result } = renderHook(() => useGameSync())

    await act(async () => {
      await result.current.connect()
    })

    expect(result.current.isConnected).toBe(false)
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to connect to game sync:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })

  it('should disconnect correctly', () => {
    const { result } = renderHook(() => useGameSync())

    act(() => {
      result.current.disconnect()
    })

    expect(mockGameSyncManager.disconnect).toHaveBeenCalled()
  })

  it('should join game correctly', () => {
    const { result } = renderHook(() => useGameSync())

    act(() => {
      result.current.joinGame(1)
    })

    expect(mockGameSyncManager.addPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0x1234567890123456789012345678901234567890',
        heroId: 1,
        status: 'idle',
        position: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      })
    )
  })

  it('should leave game correctly', () => {
    const { result } = renderHook(() => useGameSync())

    act(() => {
      result.current.leaveGame()
    })

    expect(mockGameSyncManager.removePlayer).toHaveBeenCalledWith(
      '0x1234567890123456789012345678901234567890'
    )
  })

  it('should update position correctly', () => {
    const { result } = renderHook(() => useGameSync())

    act(() => {
      result.current.updatePosition(100, 200)
    })

    expect(mockGameSyncManager.updatePlayer).toHaveBeenCalledWith(
      '0x1234567890123456789012345678901234567890',
      { position: { x: 100, y: 200 } }
    )
  })

  it('should find match correctly', () => {
    const mockOpponent = {
      address: '0x2222222222222222222222222222222222222222',
      heroId: 2,
      position: { x: 300, y: 400 },
      status: 'idle' as const,
      lastUpdate: Date.now(),
    }

    mockGameSyncManager.findMatch.mockReturnValue(mockOpponent)

    const { result } = renderHook(() => useGameSync())

    const opponent = result.current.findMatch()

    expect(mockGameSyncManager.findMatch).toHaveBeenCalledWith(
      '0x1234567890123456789012345678901234567890'
    )
    expect(opponent).toEqual(mockOpponent)
  })

  it('should create battle correctly', () => {
    const { result } = renderHook(() => useGameSync())

    // Set up player state first
    act(() => {
      result.current.joinGame(1)
    })

    // Simulate player state being set
    const playerJoinedHandler = mockGameSyncManager.on.mock.calls.find(
      call => call[0] === 'playerJoined'
    )?.[1]

    act(() => {
      playerJoinedHandler?.({
        player: {
          address: '0x1234567890123456789012345678901234567890',
          heroId: 1,
          position: { x: 100, y: 200 },
          status: 'idle',
          lastUpdate: Date.now(),
        },
      })
    })

    mockGameSyncManager.createBattle.mockReturnValue(undefined)

    const battleId = result.current.createBattle(
      '0x2222222222222222222222222222222222222222',
      2
    )

    expect(mockGameSyncManager.createBattle).toHaveBeenCalledWith(
      expect.objectContaining({
        player1: '0x1234567890123456789012345678901234567890',
        player2: '0x2222222222222222222222222222222222222222',
        hero1Id: 1,
        hero2Id: 2,
        status: 'waiting',
      })
    )
  })

  it('should make battle move correctly', () => {
    const { result } = renderHook(() => useGameSync())

    act(() => {
      result.current.makeBattleMove('battle_123', 'attack', 'target')
    })

    expect(mockGameSyncManager.addBattleMove).toHaveBeenCalledWith(
      'battle_123',
      expect.objectContaining({
        playerId: '0x1234567890123456789012345678901234567890',
        action: 'attack',
        target: 'target',
        timestamp: expect.any(Number),
      })
    )
  })

  it('should handle player joined event', () => {
    const { result } = renderHook(() => useGameSync())

    const newPlayer = {
      address: '0x2222222222222222222222222222222222222222',
      heroId: 2,
      position: { x: 300, y: 400 },
      status: 'idle' as const,
      lastUpdate: Date.now(),
    }

    // Get the event handler
    const playerJoinedHandler = mockGameSyncManager.on.mock.calls.find(
      call => call[0] === 'playerJoined'
    )?.[1]

    act(() => {
      playerJoinedHandler?.({ player: newPlayer })
    })

    expect(result.current.onlinePlayers).toContainEqual(newPlayer)
  })

  it('should handle player left event', () => {
    const { result } = renderHook(() => useGameSync())

    const player = {
      address: '0x2222222222222222222222222222222222222222',
      heroId: 2,
      position: { x: 300, y: 400 },
      status: 'idle' as const,
      lastUpdate: Date.now(),
    }

    // Add player first
    const playerJoinedHandler = mockGameSyncManager.on.mock.calls.find(
      call => call[0] === 'playerJoined'
    )?.[1]

    act(() => {
      playerJoinedHandler?.({ player })
    })

    // Then remove player
    const playerLeftHandler = mockGameSyncManager.on.mock.calls.find(
      call => call[0] === 'playerLeft'
    )?.[1]

    act(() => {
      playerLeftHandler?.({ address: player.address })
    })

    expect(result.current.onlinePlayers).not.toContainEqual(player)
  })

  it('should handle battle created event', () => {
    const { result } = renderHook(() => useGameSync())

    const battle = {
      id: 'battle_123',
      player1: '0x1234567890123456789012345678901234567890',
      player2: '0x2222222222222222222222222222222222222222',
      hero1Id: 1,
      hero2Id: 2,
      status: 'waiting' as const,
      currentTurn: '0x1234567890123456789012345678901234567890',
      moves: [],
      startTime: Date.now(),
    }

    const battleCreatedHandler = mockGameSyncManager.on.mock.calls.find(
      call => call[0] === 'battleCreated'
    )?.[1]

    act(() => {
      battleCreatedHandler?.({ battle })
    })

    expect(result.current.activeBattles).toContainEqual(battle)
    expect(result.current.currentBattle).toEqual(battle)
  })

  it('should handle battle completed event', () => {
    const { result } = renderHook(() => useGameSync())

    const battle = {
      id: 'battle_123',
      player1: '0x1234567890123456789012345678901234567890',
      player2: '0x2222222222222222222222222222222222222222',
      hero1Id: 1,
      hero2Id: 2,
      status: 'completed' as const,
      currentTurn: '0x1234567890123456789012345678901234567890',
      moves: [],
      startTime: Date.now(),
    }

    // Add battle first
    const battleCreatedHandler = mockGameSyncManager.on.mock.calls.find(
      call => call[0] === 'battleCreated'
    )?.[1]

    act(() => {
      battleCreatedHandler?.({ battle: { ...battle, status: 'active' } })
    })

    // Then complete battle
    const battleCompletedHandler = mockGameSyncManager.on.mock.calls.find(
      call => call[0] === 'battleCompleted'
    )?.[1]

    act(() => {
      battleCompletedHandler?.({ 
        battleId: battle.id, 
        winner: battle.player1, 
        battle 
      })
    })

    expect(result.current.activeBattles).not.toContainEqual(battle)
    expect(result.current.currentBattle).toBeNull()
  })

  it('should update online players periodically', () => {
    const mockPlayers = [
      {
        address: '0x1111111111111111111111111111111111111111',
        heroId: 1,
        position: { x: 100, y: 200 },
        status: 'idle' as const,
        lastUpdate: Date.now(),
      },
    ]

    mockGameSyncManager.getOnlinePlayers.mockReturnValue(mockPlayers)

    const { result } = renderHook(() => useGameSync())

    // Simulate connected state
    const connectedHandler = mockGameSyncManager.on.mock.calls.find(
      call => call[0] === 'connected'
    )?.[1]

    act(() => {
      connectedHandler?.()
    })

    // Fast-forward timers to trigger periodic update
    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(mockGameSyncManager.getOnlinePlayers).toHaveBeenCalled()
  })

  it('should handle disconnected event', () => {
    const { result } = renderHook(() => useGameSync())

    // First connect
    const connectedHandler = mockGameSyncManager.on.mock.calls.find(
      call => call[0] === 'connected'
    )?.[1]

    act(() => {
      connectedHandler?.()
    })

    expect(result.current.isConnected).toBe(true)

    // Then disconnect
    const disconnectedHandler = mockGameSyncManager.on.mock.calls.find(
      call => call[0] === 'disconnected'
    )?.[1]

    act(() => {
      disconnectedHandler?.()
    })

    expect(result.current.isConnected).toBe(false)
    expect(result.current.playerState).toBeNull()
    expect(result.current.currentBattle).toBeNull()
  })

  it('should cleanup event listeners on unmount', () => {
    const { unmount } = renderHook(() => useGameSync())

    const offCalls = mockGameSyncManager.off.mock.calls.length

    unmount()

    expect(mockGameSyncManager.off.mock.calls.length).toBeGreaterThan(offCalls)
  })
})
