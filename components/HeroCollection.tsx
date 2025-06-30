import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import {
  GAME_CONSTANTS,
  formatMWAR,
  parseMWAR,
  getRarityColor,
  getClassIcon,
  GAS_CONFIG
} from '@/utils/web3Config';
import {
  CONTRACT_ADDRESSES,
  HERO_NFT_ABI,
  MWAR_TOKEN_ABI
} from '@/utils/contractABI';
import TransactionStatus from './TransactionStatus';
import ClientOnly from './ClientOnly';

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // 读取MWAR授权额度
  const { data: allowance } = useReadContract({
    address: CONTRACT_ADDRESSES.MWAR_TOKEN as `0x${string}`,
    abi: MWAR_TOKEN_ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, CONTRACT_ADDRESSES.HERO_NFT as `0x${string}`],
  }) as { data: bigint | undefined };

  // 铸造英雄
  const { writeContract, data: mintHash } = useWriteContract();
  const { writeContract: writeApproval, data: approvalHash } = useWriteContract();

  const { isLoading: isMintLoading, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({
    hash: mintHash,
  });

  const { isLoading: isApprovalLoading, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({
    hash: approvalHash,
  });

  // 获取用户的英雄数据
  useEffect(() => {
    const fetchHeroes = async () => {
      if (!address || !heroBalance || heroBalance === 0n) {
        setHeroes([]);
        return;
      }

      try {
        const heroList: Hero[] = [];
        const balance = Number(heroBalance);

        // 从合约获取真实的英雄数据
        for (let i = 0; i < balance; i++) {
          try {
            // 获取用户的第i个英雄的tokenId
            const response = await fetch('/api/heroes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'getTokenByIndex',
                owner: address,
                index: i
              })
            });

            if (response.ok) {
              const { tokenId } = await response.json();

              // 获取英雄属性
              const attrResponse = await fetch('/api/heroes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'getAttributes',
                  tokenId: tokenId
                })
              });

              if (attrResponse.ok) {
                const { attributes } = await attrResponse.json();
                const hero: Hero = {
                  tokenId: Number(tokenId),
                  attributes: {
                    strength: BigInt(attributes.strength),
                    intelligence: BigInt(attributes.intelligence),
                    agility: BigInt(attributes.agility),
                    vitality: BigInt(attributes.vitality),
                    luck: BigInt(attributes.luck),
                    level: BigInt(attributes.level),
                    experience: BigInt(attributes.experience),
                    rarity: Number(attributes.rarity),
                    class: Number(attributes.class),
                    birthTime: BigInt(attributes.birthTime)
                  }
                };
                heroList.push(hero);
              }
            }
          } catch (heroError) {
            // 如果获取单个英雄失败，跳过
            continue;
          }
        }

        setHeroes(heroList);
      } catch (error) {
        // 静默处理错误
      }
    };

    fetchHeroes();
  }, [address, heroBalance]);

  // 监听授权成功事件，自动进行铸造
  useEffect(() => {
    if (isApprovalSuccess && isLoading) {
      handleMintHero();
    }
  }, [isApprovalSuccess, isLoading]);

  // 监听铸造成功事件
  useEffect(() => {
    if (isMintSuccess) {
      setIsLoading(false);
      // 刷新英雄列表
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, [isMintSuccess]);

  const handleApproveAndMint = async () => {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    try {
      // 获取铸造成本
      const mintCost = GAME_CONSTANTS.MINT_COSTS[selectedRarity as keyof typeof GAME_CONSTANTS.MINT_COSTS];
      const mintCostWei = parseMWAR(mintCost.toString());



      // 检查MWAR余额
      const currentBalance = mwarBalance || BigInt(0);
      if (currentBalance < mintCostWei) {
        alert(`Insufficient MWAR balance. You need ${mintCost} MWAR but only have ${formatMWAR(currentBalance)} MWAR.`);
        setIsLoading(false);
        return;
      }

      // 检查授权额度
      const currentAllowance = allowance || BigInt(0);
      if (currentAllowance < mintCostWei) {
        // 授权MWAR代币
        await writeApproval({
          address: CONTRACT_ADDRESSES.MWAR_TOKEN as `0x${string}`,
          abi: MWAR_TOKEN_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.HERO_NFT as `0x${string}`, mintCostWei],
          gas: BigInt(GAS_CONFIG.gasLimits.approve),
        });
        return; // 等待授权完成后再铸造
      }

      // 如果已经有足够的授权，直接铸造
      await handleMintHero();

    } catch (error) {
      setIsLoading(false);

      // 更友好的错误处理
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          alert('Transaction was cancelled by user.');
        } else if (error.message.includes('insufficient funds')) {
          alert('Insufficient funds for gas fees.');
        } else {
          alert('Operation failed. Please try again.');
        }
      } else {
        alert('Operation failed. Please try again.');
      }
    }
  };

  const handleMintHero = async () => {
    try {
      // 确保参数是正确的类型
      const mintArgs = [
        address,
        BigInt(selectedRarity),
        BigInt(selectedClass),
        `https://api.monadwarriors.com/hero/${Date.now()}.json`
      ];

      await writeContract({
        address: CONTRACT_ADDRESSES.HERO_NFT as `0x${string}`,
        abi: HERO_NFT_ABI,
        functionName: 'mintHero',
        args: mintArgs,
        gas: BigInt(GAS_CONFIG.gasLimits.mintHero),
      });

    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <ClientOnly>
        <TransactionStatus 
          hash={mintHash || approvalHash}
          successMessage="Transaction completed successfully! 🎉"
          errorMessage="Transaction failed"
        />
      </ClientOnly>

      <div className="glass-panel p-6">
        <h3 className="text-xl font-semibold mb-4">⚔️ Hero Collection</h3>
        
        {!address ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🔗</div>
            <p className="text-gray-400">Connect your wallet to view and mint heroes</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Mint Section */}
            <div>
              <h4 className="text-lg font-semibold mb-4">🎯 Mint New Hero</h4>
              
              <div className="space-y-4">
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
                          <span className="text-yellow-400">
                            {GAME_CONSTANTS.MINT_COSTS[index as keyof typeof GAME_CONSTANTS.MINT_COSTS]} MWAR
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

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

                <button
                  onClick={handleApproveAndMint}
                  disabled={isLoading || isApprovalLoading || isMintLoading}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading || isApprovalLoading || isMintLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="loading-spinner"></div>
                      <span>
                        {isApprovalLoading ? 'Approving...' : 'Minting...'}
                      </span>
                    </div>
                  ) : (
                    `Mint ${GAME_CONSTANTS.RARITY_NAMES[selectedRarity]} ${GAME_CONSTANTS.CLASS_NAMES[selectedClass]} (${GAME_CONSTANTS.MINT_COSTS[selectedRarity as keyof typeof GAME_CONSTANTS.MINT_COSTS]} MWAR)`
                  )}
                </button>
              </div>
            </div>

            {/* Balance Info */}
            <div>
              <h4 className="text-lg font-semibold mb-4">💰 Wallet Info</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Heroes Owned:</span>
                  <span className="text-blue-400 font-semibold">
                    {heroBalance ? Number(heroBalance) : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>MWAR Balance:</span>
                  <span className="text-yellow-400">
                    {mwarBalance ? formatMWAR(mwarBalance) : '0.00'} MWAR
                  </span>
                </div>
                {allowance && (
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span>Approved:</span>
                    <span className="text-green-400">
                      {formatMWAR(allowance)} MWAR
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Heroes Display */}
      <div className="glass-panel p-6">
        <h4 className="text-lg font-semibold mb-4">🏆 Your Heroes</h4>
        
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
                    <div className="text-sm text-gray-400">#{hero.tokenId}</div>
                    <div className="text-sm">Lv.{Number(hero.attributes.level)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>STR:</span>
                    <span className="text-red-400">{Number(hero.attributes.strength)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>INT:</span>
                    <span className="text-blue-400">{Number(hero.attributes.intelligence)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>AGI:</span>
                    <span className="text-green-400">{Number(hero.attributes.agility)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VIT:</span>
                    <span className="text-yellow-400">{Number(hero.attributes.vitality)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>LUK:</span>
                    <span className="text-purple-400">{Number(hero.attributes.luck)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>EXP:</span>
                    <span className="text-gray-400">{Number(hero.attributes.experience)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
