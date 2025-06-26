import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import HeroCollection from '@/components/HeroCollection'

// Mock the wagmi hooks
jest.mock('wagmi')

const mockUseAccount = useAccount as jest.MockedFunction<typeof useAccount>
const mockUseReadContract = useReadContract as jest.MockedFunction<typeof useReadContract>
const mockUseWriteContract = useWriteContract as jest.MockedFunction<typeof useWriteContract>
const mockUseWaitForTransactionReceipt = useWaitForTransactionReceipt as jest.MockedFunction<typeof useWaitForTransactionReceipt>

describe('HeroCollection', () => {
  const mockWriteContract = jest.fn()

  beforeEach(() => {
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
      isConnecting: false,
      isDisconnected: false,
      isReconnecting: false,
      status: 'connected',
    } as any)

    mockUseReadContract.mockReturnValue({
      data: BigInt('1000000000000000000000'), // 1000 MWAR
      isError: false,
      isLoading: false,
    } as any)

    mockUseWriteContract.mockReturnValue({
      writeContract: mockWriteContract,
      data: null,
      error: null,
      isError: false,
      isIdle: true,
      isPending: false,
      isSuccess: false,
      reset: jest.fn(),
      status: 'idle',
      variables: undefined,
    } as any)

    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
      data: null,
      error: null,
      isError: false,
      isIdle: true,
      status: 'idle',
    } as any)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders hero collection interface', () => {
    render(<HeroCollection />)
    
    expect(screen.getByText('Hero Collection')).toBeInTheDocument()
    expect(screen.getByText('Mint New Hero')).toBeInTheDocument()
    expect(screen.getByText('Your Heroes')).toBeInTheDocument()
  })

  it('displays MWAR balance correctly', () => {
    render(<HeroCollection />)
    
    expect(screen.getByText('MWAR Balance')).toBeInTheDocument()
    expect(screen.getByText('1000.00 MWAR')).toBeInTheDocument()
  })

  it('shows hero count', () => {
    mockUseReadContract.mockReturnValueOnce({
      data: BigInt('3'), // 3 heroes
      isError: false,
      isLoading: false,
    } as any)

    render(<HeroCollection />)
    
    expect(screen.getByText(/You own.*3.*heroes/)).toBeInTheDocument()
  })

  it('allows rarity selection', () => {
    render(<HeroCollection />)
    
    const commonButton = screen.getByText('Common')
    const rareButton = screen.getByText('Rare')
    const epicButton = screen.getByText('Epic')
    const legendaryButton = screen.getByText('Legendary')
    
    expect(commonButton).toBeInTheDocument()
    expect(rareButton).toBeInTheDocument()
    expect(epicButton).toBeInTheDocument()
    expect(legendaryButton).toBeInTheDocument()
    
    fireEvent.click(rareButton)
    // Should update selection (visual feedback tested via CSS classes)
  })

  it('allows class selection', () => {
    render(<HeroCollection />)
    
    const warriorButton = screen.getByText('Warrior')
    const mageButton = screen.getByText('Mage')
    const archerButton = screen.getByText('Archer')
    const assassinButton = screen.getByText('Assassin')
    const priestButton = screen.getByText('Priest')
    
    expect(warriorButton).toBeInTheDocument()
    expect(mageButton).toBeInTheDocument()
    expect(archerButton).toBeInTheDocument()
    expect(assassinButton).toBeInTheDocument()
    expect(priestButton).toBeInTheDocument()
    
    fireEvent.click(mageButton)
    // Should update selection
  })

  it('displays mint costs correctly', () => {
    render(<HeroCollection />)
    
    expect(screen.getByText('100 MWAR')).toBeInTheDocument() // Common
    expect(screen.getByText('300 MWAR')).toBeInTheDocument() // Rare
    expect(screen.getByText('800 MWAR')).toBeInTheDocument() // Epic
    expect(screen.getByText('2000 MWAR')).toBeInTheDocument() // Legendary
  })

  it('handles mint button click', async () => {
    render(<HeroCollection />)
    
    const mintButton = screen.getByRole('button', { name: /Mint Common Warrior/ })
    fireEvent.click(mintButton)
    
    await waitFor(() => {
      expect(mockWriteContract).toHaveBeenCalled()
    })
  })

  it('disables mint button when not connected', () => {
    mockUseAccount.mockReturnValue({
      address: undefined,
      isConnected: false,
      isConnecting: false,
      isDisconnected: true,
      isReconnecting: false,
      status: 'disconnected',
    } as any)

    render(<HeroCollection />)
    
    const mintButton = screen.getByRole('button', { name: /Mint Common Warrior/ })
    expect(mintButton).toBeDisabled()
  })

  it('shows loading state during minting', () => {
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: true,
      isSuccess: false,
      data: null,
      error: null,
      isError: false,
      isIdle: false,
      status: 'pending',
    } as any)

    render(<HeroCollection />)
    
    expect(screen.getByText('Minting...')).toBeInTheDocument()
  })

  it('displays no heroes message when collection is empty', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt('0'), // 0 heroes
      isError: false,
      isLoading: false,
    } as any)

    render(<HeroCollection />)
    
    expect(screen.getByText('No Heroes Yet')).toBeInTheDocument()
    expect(screen.getByText('Mint your first hero to start your journey!')).toBeInTheDocument()
  })

  it('updates mint button text based on selection', () => {
    render(<HeroCollection />)
    
    // Select Rare Mage
    fireEvent.click(screen.getByText('Rare'))
    fireEvent.click(screen.getByText('Mage'))
    
    expect(screen.getByRole('button', { name: /Mint Rare Mage \(300 MWAR\)/ })).toBeInTheDocument()
  })

  it('handles contract read errors gracefully', () => {
    mockUseReadContract.mockReturnValue({
      data: null,
      isError: true,
      isLoading: false,
      error: new Error('Contract read failed'),
    } as any)

    render(<HeroCollection />)
    
    // Should still render without crashing
    expect(screen.getByText('Hero Collection')).toBeInTheDocument()
    expect(screen.getByText('0.00 MWAR')).toBeInTheDocument() // Fallback value
  })
})
