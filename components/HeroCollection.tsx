import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import {
  GAME_CONSTANTS,
  formatMWAR,
  getRarityColor,
  getClassIcon
} from '@/utils/web3Config';
import {
  CONTRACT_ADDRESSES,
  HERO_NFT_ABI,
  MWAR_TOKEN_ABI
} from '@/utils/contractABI';

interface HeroAttributes {
  strength: bigint;
  intelligence: bigint;
  agility: bigint;
  vitality: bigint;
  luck: bigint;
  level: bigint;
  experience: bigint;
  rarity: number;
  class: number;
  birthTime: bigint;
}

interface Hero {
  tokenId: number;
  attributes: HeroAttributes;
}

export default function HeroCollection() {
  const { address } = useAccount();
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [selectedRarity, setSelectedRarity] = useState(0);
  const [selectedClass, setSelectedClass] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // 读取用户的英雄数量
  const { data: heroBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.HERO_NFT as `0x${string}`,
    abi: HERO_NFT_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  }) as { data: bigint | undefined };

  // 读取MWAR余额
  const { data: mwarBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.MWAR_TOKEN as `0x${string}`,
    abi: MWAR_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  }) as { data: bigint | undefined };

  // 铸造英雄
  const { writeContract, data: mintHash } = useWriteContract();
  
  const { isLoading: isMintLoading, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({
    hash: mintHash,
  });

  const handleMintHero = async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      // 首先批准MWAR代币消费
      const mintCost = GAME_CONSTANTS.MINT_COSTS[selectedRarity as keyof typeof GAME_CONSTANTS.MINT_COSTS];
      
      await writeContract({
        address: CONTRACT_ADDRESSES.MWAR_TOKEN as `0x${string}`,
        abi: MWAR_TOKEN_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.HERO_NFT as `0x${string}`, BigInt(mintCost) * BigInt(1e18)],
      });

      // 然后铸造英雄
      await writeContract({
        address: CONTRACT_ADDRESSES.HERO_NFT as `0x${string}`,
        abi: HERO_NFT_ABI,
        functionName: 'mintHero',
        args: [
          address,
          selectedRarity,
          selectedClass,
          `https://api.monadwarriors.com/hero/${Date.now()}.json`
        ],
      });
    } catch (error) {
      console.error('Mint failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePower = (attributes: HeroAttributes): number => {
    return Number(
      attributes.strength + 
      attributes.intelligence + 
      attributes.agility + 
      attributes.vitality + 
      attributes.luck
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Hero Collection</h2>
          <div className="text-right">
            <div className="text-sm text-gray-400">MWAR Balance</div>
            <div className="text-lg font-semibold text-green-400">
              {mwarBalance ? formatMWAR(mwarBalance) : '0.00'} MWAR
            </div>
          </div>
        </div>
        
        <div className="text-gray-300">
          You own <span className="text-blue-400 font-semibold">{heroBalance?.toString() || '0'}</span> heroes
        </div>
      </div>

      {/* Mint New Hero */}
      <div className="glass-panel p-6">
        <h3 className="text-xl font-semibold mb-4">Mint New Hero</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Rarity Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Rarity</label>
            <div className="space-y-2">
              {GAME_CONSTANTS.RARITY_NAMES.map((rarity, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedRarity(index)}
                  className={`w-full p-3 rounded-lg border-2 transition-all duration-300 ${
                    selectedRarity === index
                      ? `border-${GAME_CONSTANTS.RARITY_COLORS[index]}-400 bg-${GAME_CONSTANTS.RARITY_COLORS[index]}-400/20`
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={getRarityColor(index)}>{rarity}</span>
                    <span className="text-yellow-400">{GAME_CONSTANTS.MINT_COSTS[index as keyof typeof GAME_CONSTANTS.MINT_COSTS]} MWAR</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Class Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Class</label>
            <div className="space-y-2">
              {GAME_CONSTANTS.CLASS_NAMES.map((className, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedClass(index)}
                  className={`w-full p-3 rounded-lg border-2 transition-all duration-300 ${
                    selectedClass === index
                      ? 'border-blue-400 bg-blue-400/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getClassIcon(index)}</span>
                    <span>{className}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleMintHero}
            disabled={isLoading || isMintLoading || !address}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading || isMintLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="loading-spinner"></div>
                <span>Minting...</span>
              </div>
            ) : (
              `Mint ${GAME_CONSTANTS.RARITY_NAMES[selectedRarity as keyof typeof GAME_CONSTANTS.RARITY_NAMES]} ${GAME_CONSTANTS.CLASS_NAMES[selectedClass as keyof typeof GAME_CONSTANTS.CLASS_NAMES]} (${GAME_CONSTANTS.MINT_COSTS[selectedRarity as keyof typeof GAME_CONSTANTS.MINT_COSTS]} MWAR)`
            )}
          </button>
        </div>
      </div>

      {/* Hero Grid */}
      <div className="glass-panel p-6">
        <h3 className="text-xl font-semibold mb-4">Your Heroes</h3>
        
        {heroes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚔️</div>
            <h4 className="text-xl font-semibold mb-2">No Heroes Yet</h4>
            <p className="text-gray-400">Mint your first hero to start your journey!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {heroes.map((hero) => (
              <div
                key={hero.tokenId}
                className={`hero-card ${GAME_CONSTANTS.RARITY_NAMES[hero.attributes.rarity].toLowerCase()}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getClassIcon(hero.attributes.class)}</span>
                    <div>
                      <div className="font-semibold">
                        {GAME_CONSTANTS.CLASS_NAMES[hero.attributes.class]}
                      </div>
                      <div className={`text-sm ${getRarityColor(hero.attributes.rarity)}`}>
                        {GAME_CONSTANTS.RARITY_NAMES[hero.attributes.rarity]}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Level</div>
                    <div className="text-lg font-bold">{hero.attributes.level.toString()}</div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span>⚔️ Strength</span>
                    <span>{hero.attributes.strength.toString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>🧠 Intelligence</span>
                    <span>{hero.attributes.intelligence.toString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>💨 Agility</span>
                    <span>{hero.attributes.agility.toString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>❤️ Vitality</span>
                    <span>{hero.attributes.vitality.toString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>🍀 Luck</span>
                    <span>{hero.attributes.luck.toString()}</span>
                  </div>
                </div>

                <div className="border-t border-gray-600 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Total Power</span>
                    <span className="text-lg font-bold text-yellow-400">
                      {calculatePower(hero.attributes)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <button className="btn-primary w-full text-sm py-2">
                    Level Up
                  </button>
                  <button className="btn-secondary w-full text-sm py-2">
                    Battle
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
