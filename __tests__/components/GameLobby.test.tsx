import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GameLobby from '@/components/GameLobby'

// Mock the useGameSync hook
jest.mock('@/hooks/useGameSync', () => ({
  useGameSync: jest.fn(() => ({
    isConnected: true,
    onlinePlayers: [
      {
        address: '0x1111111111111111111111111111111111111111',
        heroId: 1,
        position: { x: 100, y: 200 },
        status: 'idle',
        lastUpdate: Date.now(),
      },
      {
        address: '0x2222222222222222222222222222222222222222',
        heroId: 2,
        position: { x: 300, y: 400 },
        status: 'battling',
        lastUpdate: Date.now(),
      },
    ],
    activeBattles: [
      {
        id: 'battle_1',
        player1: '0x1111111111111111111111111111111111111111',
        player2: '0x2222222222222222222222222222222222222222',
        hero1Id: 1,
        hero2Id: 2,
        status: 'active',
        currentTurn: '0x1111111111111111111111111111111111111111',
        moves: [],
        startTime: Date.now(),
      },
    ],
    currentBattle: null,
    playerState: null,
    joinGame: jest.fn(),
    leaveGame: jest.fn(),
    updatePosition: jest.fn(),
    findMatch: jest.fn(() => ({
      address: '0x3333333333333333333333333333333333333333',
      heroId: 3,
      position: { x: 500, y: 600 },
      status: 'idle',
      lastUpdate: Date.now(),
    })),
    createBattle: jest.fn(() => 'battle_123'),
    makeBattleMove: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
}))

describe('GameLobby', () => {
  it('renders connection status', () => {
    render(<GameLobby />)
    
    expect(screen.getByText('MultiSYNQ Status: Connected')).toBeInTheDocument()
    expect(screen.getByText(/2 players online • 1 active battles/)).toBeInTheDocument()
  })

  it('shows join lobby interface when not in game', () => {
    render(<GameLobby />)
    
    expect(screen.getByText('Join Game Lobby')).toBeInTheDocument()
    expect(screen.getByText('Select Your Hero')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Join Lobby' })).toBeInTheDocument()
  })

  it('allows hero selection for joining lobby', () => {
    render(<GameLobby />)
    
    const heroButtons = screen.getAllByRole('button')
    const heroButton = heroButtons.find(button => 
      button.textContent?.includes('Warrior') || 
      button.textContent?.includes('Mage') || 
      button.textContent?.includes('Archer')
    )
    
    expect(heroButton).toBeInTheDocument()
    
    if (heroButton) {
      fireEvent.click(heroButton)
      // Should update selection
    }
  })

  it('disables join button when disconnected', () => {
    // Mock disconnected state
    const mockUseGameSync = require('@/hooks/useGameSync').useGameSync
    mockUseGameSync.mockReturnValue({
      ...mockUseGameSync(),
      isConnected: false,
    })

    render(<GameLobby />)
    
    const joinButton = screen.getByRole('button', { name: 'Connecting...' })
    expect(joinButton).toBeDisabled()
  })

  it('shows game lobby interface when player is in game', () => {
    const mockUseGameSync = require('@/hooks/useGameSync').useGameSync
    mockUseGameSync.mockReturnValue({
      ...mockUseGameSync(),
      playerState: {
        address: '0x1234567890123456789012345678901234567890',
        heroId: 1,
        position: { x: 100, y: 200 },
        status: 'idle',
        lastUpdate: Date.now(),
      },
    })

    render(<GameLobby />)
    
    expect(screen.getByText('Game Lobby')).toBeInTheDocument()
    expect(screen.getByText('Your Hero')).toBeInTheDocument()
    expect(screen.getByText('Quick Match')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Leave Lobby' })).toBeInTheDocument()
  })

  it('displays player status correctly', () => {
    const mockUseGameSync = require('@/hooks/useGameSync').useGameSync
    mockUseGameSync.mockReturnValue({
      ...mockUseGameSync(),
      playerState: {
        address: '0x1234567890123456789012345678901234567890',
        heroId: 1,
        position: { x: 150, y: 250 },
        status: 'idle',
        lastUpdate: Date.now(),
      },
    })

    render(<GameLobby />)
    
    expect(screen.getByText('Status:')).toBeInTheDocument()
    expect(screen.getByText('idle')).toBeInTheDocument()
    expect(screen.getByText('Position: (150, 250)')).toBeInTheDocument()
  })

  it('shows online players list', () => {
    const mockUseGameSync = require('@/hooks/useGameSync').useGameSync
    mockUseGameSync.mockReturnValue({
      ...mockUseGameSync(),
      playerState: {
        address: '0x1234567890123456789012345678901234567890',
        heroId: 1,
        position: { x: 100, y: 200 },
        status: 'idle',
        lastUpdate: Date.now(),
      },
    })

    render(<GameLobby />)
    
    expect(screen.getByText('Online Players (2)')).toBeInTheDocument()
    expect(screen.getByText('0x1111...1111')).toBeInTheDocument()
    expect(screen.getByText('0x2222...2222')).toBeInTheDocument()
  })

  it('allows challenging other players', () => {
    const mockUseGameSync = require('@/hooks/useGameSync').useGameSync
    const mockCreateBattle = jest.fn()
    
    mockUseGameSync.mockReturnValue({
      ...mockUseGameSync(),
      playerState: {
        address: '0x1234567890123456789012345678901234567890',
        heroId: 1,
        position: { x: 100, y: 200 },
        status: 'idle',
        lastUpdate: Date.now(),
      },
      createBattle: mockCreateBattle,
    })

    render(<GameLobby />)
    
    const challengeButtons = screen.getAllByText('Challenge')
    expect(challengeButtons.length).toBeGreaterThan(0)
    
    fireEvent.click(challengeButtons[0])
    expect(mockCreateBattle).toHaveBeenCalled()
  })

  it('handles quick match functionality', () => {
    const mockUseGameSync = require('@/hooks/useGameSync').useGameSync
    const mockFindMatch = jest.fn(() => ({
      address: '0x3333333333333333333333333333333333333333',
      heroId: 3,
      position: { x: 500, y: 600 },
      status: 'idle',
      lastUpdate: Date.now(),
    }))
    const mockCreateBattle = jest.fn()
    
    mockUseGameSync.mockReturnValue({
      ...mockUseGameSync(),
      playerState: {
        address: '0x1234567890123456789012345678901234567890',
        heroId: 1,
        position: { x: 100, y: 200 },
        status: 'idle',
        lastUpdate: Date.now(),
      },
      findMatch: mockFindMatch,
      createBattle: mockCreateBattle,
    })

    render(<GameLobby />)
    
    const quickMatchButton = screen.getByRole('button', { name: 'Find Match' })
    fireEvent.click(quickMatchButton)
    
    expect(mockFindMatch).toHaveBeenCalled()
    expect(mockCreateBattle).toHaveBeenCalled()
  })

  it('shows active battle interface when in battle', () => {
    const mockUseGameSync = require('@/hooks/useGameSync').useGameSync
    mockUseGameSync.mockReturnValue({
      ...mockUseGameSync(),
      playerState: {
        address: '0x1234567890123456789012345678901234567890',
        heroId: 1,
        position: { x: 100, y: 200 },
        status: 'battling',
        lastUpdate: Date.now(),
      },
      currentBattle: {
        id: 'battle_123',
        player1: '0x1234567890123456789012345678901234567890',
        player2: '0x2222222222222222222222222222222222222222',
        hero1Id: 1,
        hero2Id: 2,
        status: 'active',
        currentTurn: '0x1234567890123456789012345678901234567890',
        moves: [],
        startTime: Date.now(),
      },
    })

    render(<GameLobby />)
    
    expect(screen.getByText('Active Battle')).toBeInTheDocument()
    expect(screen.getByText('Your Turn')).toBeInTheDocument()
    expect(screen.getByText('Choose Action')).toBeInTheDocument()
  })

  it('allows battle actions when it is player turn', () => {
    const mockUseGameSync = require('@/hooks/useGameSync').useGameSync
    const mockMakeBattleMove = jest.fn()
    
    mockUseGameSync.mockReturnValue({
      ...mockUseGameSync(),
      playerState: {
        address: '0x1234567890123456789012345678901234567890',
        heroId: 1,
        position: { x: 100, y: 200 },
        status: 'battling',
        lastUpdate: Date.now(),
      },
      currentBattle: {
        id: 'battle_123',
        player1: '0x1234567890123456789012345678901234567890',
        player2: '0x2222222222222222222222222222222222222222',
        hero1Id: 1,
        hero2Id: 2,
        status: 'active',
        currentTurn: '0x1234567890123456789012345678901234567890',
        moves: [],
        startTime: Date.now(),
      },
      makeBattleMove: mockMakeBattleMove,
    })

    render(<GameLobby />)
    
    const attackButton = screen.getByText('Attack')
    const defendButton = screen.getByText('Defend')
    const specialButton = screen.getByText('Special')
    
    expect(attackButton).toBeInTheDocument()
    expect(defendButton).toBeInTheDocument()
    expect(specialButton).toBeInTheDocument()
    
    fireEvent.click(attackButton)
    
    const executeButton = screen.getByRole('button', { name: 'Execute Attack' })
    fireEvent.click(executeButton)
    
    expect(mockMakeBattleMove).toHaveBeenCalledWith('battle_123', 'attack')
  })

  it('shows battle log with moves', () => {
    const mockUseGameSync = require('@/hooks/useGameSync').useGameSync
    mockUseGameSync.mockReturnValue({
      ...mockUseGameSync(),
      playerState: {
        address: '0x1234567890123456789012345678901234567890',
        heroId: 1,
        position: { x: 100, y: 200 },
        status: 'battling',
        lastUpdate: Date.now(),
      },
      currentBattle: {
        id: 'battle_123',
        player1: '0x1234567890123456789012345678901234567890',
        player2: '0x2222222222222222222222222222222222222222',
        hero1Id: 1,
        hero2Id: 2,
        status: 'active',
        currentTurn: '0x2222222222222222222222222222222222222222',
        moves: [
          {
            playerId: '0x1234567890123456789012345678901234567890',
            action: 'attack',
            timestamp: Date.now(),
          },
        ],
        startTime: Date.now(),
      },
    })

    render(<GameLobby />)
    
    expect(screen.getByText('Battle Log')).toBeInTheDocument()
    expect(screen.getByText(/You used attack/)).toBeInTheDocument()
  })

  it('displays active battles list', () => {
    const mockUseGameSync = require('@/hooks/useGameSync').useGameSync
    mockUseGameSync.mockReturnValue({
      ...mockUseGameSync(),
      playerState: {
        address: '0x1234567890123456789012345678901234567890',
        heroId: 1,
        position: { x: 100, y: 200 },
        status: 'idle',
        lastUpdate: Date.now(),
      },
    })

    render(<GameLobby />)
    
    expect(screen.getByText('Active Battles (1)')).toBeInTheDocument()
    expect(screen.getByText('0x1111...1111 vs 0x2222...2222')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('handles leave lobby action', () => {
    const mockUseGameSync = require('@/hooks/useGameSync').useGameSync
    const mockLeaveGame = jest.fn()
    
    mockUseGameSync.mockReturnValue({
      ...mockUseGameSync(),
      playerState: {
        address: '0x1234567890123456789012345678901234567890',
        heroId: 1,
        position: { x: 100, y: 200 },
        status: 'idle',
        lastUpdate: Date.now(),
      },
      leaveGame: mockLeaveGame,
    })

    render(<GameLobby />)
    
    const leaveButton = screen.getByRole('button', { name: 'Leave Lobby' })
    fireEvent.click(leaveButton)
    
    expect(mockLeaveGame).toHaveBeenCalled()
  })
})
