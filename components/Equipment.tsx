import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { GAME_CONSTANTS, getClassIcon, getRarityColor } from '@/utils/web3Config';

interface Equipment {
  id: number | string;
  name: string;
  type: 'weapon' | 'armor' | 'accessory';
  rarity: number;
  level?: number;
  stats: {
    strength?: number;
    intelligence?: number;
    agility?: number;
    vitality?: number;
    luck?: number;
    attack?: number;
    defense?: number;
    speed?: number;
    health?: number;
  };
  requirements?: {
    level: number;
    class?: number[];
  };
  price?: number;
  description?: string;
  image?: string;
  owner?: string;
  equipped?: boolean;
}

interface EquippedItems {
  weapon?: Equipment;
  armor?: Equipment;
  accessory?: Equipment;
}

export default function Equipment() {
  const { address } = useAccount();
  const [inventory, setInventory] = useState<Equipment[]>([]);
  const [equipped, setEquipped] = useState<EquippedItems>({});
  const [selectedHeroId, setSelectedHeroId] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'inventory' | 'shop' | 'forge'>('inventory');
  const [userHeroes, setUserHeroes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [shopItems, setShopItems] = useState<Equipment[]>([]);
  const [forgeRecipes, setForgeRecipes] = useState<any[]>([]);

  // 获取真实装备数据
  const fetchEquipmentData = async (): Promise<Equipment[]> => {
    try {
      const response = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getUserEquipment',
          owner: address
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.equipment || [];
      }
    } catch (error) {
      // 静默处理错误
    }

    // 如果API失败，返回空数组
    return [];
  };

  // 获取用户英雄数据
  const fetchUserHeroes = async () => {
    if (!address) return [];

    try {
      const response = await fetch('/api/heroes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getBalance',
          owner: address
        })
      });

      if (response.ok) {
        const { balance } = await response.json();
        const heroList = [];

        for (let i = 0; i < Math.min(Number(balance), 5); i++) {
          try {
            const tokenResponse = await fetch('/api/heroes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'getTokenByIndex',
                owner: address,
                index: i
              })
            });

            if (tokenResponse.ok) {
              const { tokenId } = await tokenResponse.json();

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
                heroList.push({
                  tokenId: Number(tokenId),
                  class: Number(attributes.class),
                  level: Number(attributes.level),
                  name: GAME_CONSTANTS.CLASS_NAMES[Number(attributes.class)]
                });
              }
            }
          } catch (error) {
            continue;
          }
        }

        return heroList;
      }
    } catch (error) {
      // 静默处理错误
    }

    return [];
  };

  useEffect(() => {
    const loadData = async () => {
      if (!address) return;

      try {
        // 加载装备数据
        const equipment = await fetchEquipmentData();
        setInventory(equipment);

        // 加载英雄数据
        const heroes = await fetchUserHeroes();
        setUserHeroes(heroes);

        // 设置默认选中的英雄
        if (heroes.length > 0) {
          setSelectedHeroId(heroes[0].tokenId);
        }

        // 初始化商店数据
        initializeShopData();

        // 初始化锻造数据
        initializeForgeData();
      } catch (error) {
        // 静默处理错误
        setInventory([]);
        setUserHeroes([]);
      }
    };

    loadData();
  }, [address]);

  // 初始化商店数据
  const initializeShopData = () => {
    const mockShopItems: Equipment[] = [
      {
        id: 'shop_sword_1',
        name: 'Iron Sword',
        type: 'weapon',
        rarity: 0,
        stats: { attack: 15, defense: 0, speed: 0, health: 0 },
        price: 500,
        description: 'A sturdy iron sword for beginners'
      },
      {
        id: 'shop_sword_2',
        name: 'Steel Blade',
        type: 'weapon',
        rarity: 1,
        stats: { attack: 25, defense: 0, speed: 5, health: 0 },
        price: 1200,
        description: 'A well-crafted steel blade with improved balance'
      },
      {
        id: 'shop_armor_1',
        name: 'Leather Armor',
        type: 'armor',
        rarity: 0,
        stats: { attack: 12, defense: 0, speed: 0, health: 20 },
        price: 400,
        description: 'Basic leather protection'
      },
      {
        id: 'shop_armor_2',
        name: 'Chain Mail',
        type: 'armor',
        rarity: 1,
        stats: { attack: 0, defense: 20, speed: -2, health: 35 },
        price: 1000,
        description: 'Interlocked metal rings provide solid protection'
      },
      {
        id: 'shop_accessory_1',
        name: 'Power Ring',
        type: 'accessory',
        rarity: 1,
        stats: { attack: 8, defense: 0, speed: 0, health: 0 },
        price: 800,
        description: 'A ring that enhances physical strength'
      },
      {
        id: 'shop_staff_1',
        name: 'Mystic Staff',
        type: 'weapon',
        rarity: 2,
        stats: { attack: 30, defense: 0, speed: 0, health: 15 },
        price: 2500,
        description: 'A staff imbued with magical energy'
      }
    ];
    setShopItems(mockShopItems);
  };

  // 初始化锻造配方
  const initializeForgeData = () => {
    const mockRecipes = [
      {
        id: 'forge_sword_upgrade',
        name: 'Upgrade Iron Sword',
        description: 'Enhance your Iron Sword to Steel quality',
        requirements: [
          { item: 'Iron Sword', quantity: 1 },
          { resource: 'MWAR', quantity: 300 }
        ],
        result: {
          name: 'Enhanced Iron Sword',
          type: 'weapon',
          rarity: 1,
          stats: { attack: 20, defense: 0, speed: 3, health: 0 }
        }
      },
      {
        id: 'forge_armor_upgrade',
        name: 'Upgrade Leather Armor',
        description: 'Reinforce your Leather Armor with metal studs',
        requirements: [
          { item: 'Leather Armor', quantity: 1 },
          { resource: 'MWAR', quantity: 250 }
        ],
        result: {
          name: 'Studded Leather Armor',
          type: 'armor',
          rarity: 1,
          stats: { attack: 0, defense: 18, speed: 0, health: 30 }
        }
      }
    ];
    setForgeRecipes(mockRecipes);
  };

  // 购买装备 - 真实智能合约交互
  const handleBuyEquipment = async (item: Equipment) => {
    if (!address) {
      alert('Please connect your wallet');
      return;
    }

    try {
      // 调用装备合约的制作功能
      const response = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'craftEquipment',
          player: address,
          equipmentType: item.type === 'weapon' ? 0 : item.type === 'armor' ? 1 : 2,
          rarity: item.rarity,
          name: item.name,
          mwarCost: item.price
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 重新加载装备数据
          const equipment = await fetchEquipmentData();
          setInventory(equipment);
          alert(`Successfully crafted ${item.name}! Transaction: ${result.txHash}`);
        } else {
          alert(`Failed to craft equipment: ${result.error}`);
        }
      } else {
        alert('Failed to craft equipment');
      }
    } catch (error) {
      console.error('Equipment crafting error:', error);
      alert('Failed to craft equipment');
    }
  };

  // 锻造装备
  const handleForgeEquipment = async (recipe: any) => {
    if (!address) {
      alert('Please connect your wallet');
      return;
    }

    try {
      // 检查是否有所需材料
      const hasRequiredItems = recipe.requirements.every((req: any) => {
        if (req.resource === 'MWAR') {
          // 这里应该检查MWAR余额
          return true; // 暂时假设有足够的MWAR
        } else {
          return inventory.some(item => item.name === req.item);
        }
      });

      if (!hasRequiredItems) {
        alert('You don\'t have the required materials');
        return;
      }

      // 模拟锻造过程
      const newItem = {
        ...recipe.result,
        id: `forged_${Date.now()}`,
        owner: address
      };

      setInventory(prev => [...prev, newItem]);
      alert(`Successfully forged ${recipe.result.name}!`);
    } catch (error) {
      alert('Failed to forge equipment');
    }
  };

  const canEquip = (equipment: Equipment, heroClass: number, heroLevel: number): boolean => {
    if (!equipment.requirements) return true; // 如果没有要求，可以装备
    if (equipment.requirements.level > heroLevel) return false;
    if (equipment.requirements.class && !equipment.requirements.class.includes(heroClass)) return false;
    return true;
  };

  const handleEquip = (equipment: Equipment) => {
    const hero = userHeroes.find(h => h.tokenId === selectedHeroId);
    if (!hero) return;

    if (!canEquip(equipment, hero.class, hero.level)) {
      alert('Hero does not meet equipment requirements!');
      return;
    }

    setEquipped(prev => ({
      ...prev,
      [equipment.type]: equipment
    }));
  };

  const handleUnequip = (type: keyof EquippedItems) => {
    setEquipped(prev => ({
      ...prev,
      [type]: undefined
    }));
  };

  const calculateTotalStats = () => {
    const stats = {
      strength: 0,
      intelligence: 0,
      agility: 0,
      vitality: 0,
      luck: 0
    };

    Object.values(equipped).forEach(item => {
      if (item) {
        Object.entries(item.stats).forEach(([stat, value]) => {
          if (value && stat in stats && typeof value === 'number') {
            (stats as any)[stat] += value;
          }
        });
      }
    });

    return stats;
  };

  const getEquipmentIcon = (type: string): string => {
    switch (type) {
      case 'weapon': return '⚔️';
      case 'armor': return '🛡️';
      case 'accessory': return '💍';
      default: return '📦';
    }
  };

  // 如果没有英雄，显示提示
  if (userHeroes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="glass-panel p-8 text-center">
          <div className="text-8xl mb-6">⚔️</div>
          <h2 className="text-3xl font-bold mb-4">Equipment System</h2>
          <h3 className="text-xl text-gray-300 mb-6">No Heroes Found</h3>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            You need to mint at least one hero before you can manage equipment.
          </p>
          <div className="text-sm text-gray-500">
            Go to the Heroes tab to mint your first hero!
          </div>
        </div>
      </div>
    );
  }

  const renderEquipmentCard = (equipment: Equipment, isEquipped = false) => (
    <div
      key={equipment.id}
      className={`equipment-card ${GAME_CONSTANTS.RARITY_NAMES[equipment.rarity].toLowerCase()} ${
        isEquipped ? 'border-green-500' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{equipment.image}</span>
          <div>
            <div className="font-semibold">{equipment.name}</div>
            <div className={`text-sm ${getRarityColor(equipment.rarity)}`}>
              {GAME_CONSTANTS.RARITY_NAMES[equipment.rarity]}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Lv.{equipment.level}</div>
          <div className="text-xs text-gray-500">{equipment.type}</div>
        </div>
      </div>

      <div className="space-y-1 mb-3">
        {Object.entries(equipment.stats).map(([stat, value]) => (
          <div key={stat} className="flex justify-between text-sm">
            <span className="capitalize">{stat}</span>
            <span className="text-green-400">+{value}</span>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-400 mb-3">
        {equipment.description}
      </div>

      {equipment.requirements && equipment.requirements.level > 1 && (
        <div className="text-xs text-yellow-400 mb-3">
          Requires: Level {equipment.requirements.level}
          {equipment.requirements.class && (
            <span> • {equipment.requirements.class.map(c => GAME_CONSTANTS.CLASS_NAMES[c]).join(', ')}</span>
          )}
        </div>
      )}

      <div className="flex space-x-2">
        {isEquipped ? (
          <button
            onClick={() => handleUnequip(equipment.type as keyof EquippedItems)}
            className="btn-secondary flex-1 text-sm py-2"
          >
            Unequip
          </button>
        ) : (
          <button
            onClick={() => handleEquip(equipment)}
            className="btn-primary flex-1 text-sm py-2"
            disabled={!canEquip(equipment, userHeroes.find(h => h.tokenId === selectedHeroId)?.class || 0,
                               userHeroes.find(h => h.tokenId === selectedHeroId)?.level || 1)}
          >
            Equip
          </button>
        )}
        {activeTab === 'shop' && (
          <button className="btn-accent flex-1 text-sm py-2">
            Buy ({equipment.price} MWAR)
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold">⚔️ Equipment</h2>
          
          {/* Hero Selection */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Hero:</span>
            <select
              value={selectedHeroId}
              onChange={(e) => setSelectedHeroId(Number(e.target.value))}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2"
            >
              {userHeroes.map(hero => (
                <option key={hero.tokenId} value={hero.tokenId}>
                  {getClassIcon(hero.class)} {hero.name} (Lv.{hero.level})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-800 rounded-lg p-1 mt-4">
          {[
            { key: 'inventory', label: 'Inventory', icon: '🎒' },
            { key: 'shop', label: 'Shop', icon: '🏪' },
            { key: 'forge', label: 'Forge', icon: '🔨' }
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Currently Equipped */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold mb-4">Currently Equipped</h3>
        
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {['weapon', 'armor', 'accessory'].map(type => (
            <div key={type} className="equipment-slot">
              <div className="text-center mb-2">
                <span className="text-2xl">{getEquipmentIcon(type)}</span>
                <div className="text-sm text-gray-400 capitalize">{type}</div>
              </div>
              
              {equipped[type as keyof EquippedItems] ? (
                renderEquipmentCard(equipped[type as keyof EquippedItems]!, true)
              ) : (
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center text-gray-500">
                  No {type} equipped
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Total Stats */}
        <div className="border-t border-gray-600 pt-4">
          <h4 className="font-semibold mb-2">Equipment Bonuses</h4>
          <div className="grid grid-cols-5 gap-4 text-sm">
            {Object.entries(calculateTotalStats()).map(([stat, value]) => (
              <div key={stat} className="text-center">
                <div className="text-green-400 font-bold">+{value}</div>
                <div className="text-gray-400 capitalize">{stat}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Equipment List */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold mb-4">
          {activeTab === 'inventory' ? '🎒 Your Equipment' :
           activeTab === 'shop' ? '🏪 Equipment Shop' : '🔨 Forge'}
        </h3>

        {activeTab === 'inventory' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <h4 className="text-xl font-semibold mb-2">No Equipment</h4>
                <p className="text-gray-400">Visit the shop to buy equipment!</p>
              </div>
            ) : (
              inventory.map(equipment => renderEquipmentCard(equipment))
            )}
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shopItems.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">🛒</div>
                <h4 className="text-xl font-semibold mb-2">Loading Shop...</h4>
                <p className="text-gray-400">Please wait while we load the equipment shop</p>
              </div>
            ) : (
              shopItems.map(item => (
                <div key={item.id} className="glass-panel p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className={`font-semibold ${getRarityColor(item.rarity)}`}>
                      {item.name}
                    </h4>
                    <span className="text-2xl">
                      {item.type === 'weapon' ? '⚔️' :
                       item.type === 'armor' ? '🛡️' : '💍'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-400 mb-3">{item.description}</p>

                  <div className="space-y-2 mb-4">
                    {item.stats && item.stats.attack && item.stats.attack > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Attack:</span>
                        <span className="text-red-400">+{item.stats.attack}</span>
                      </div>
                    )}
                    {item.stats && item.stats.defense && item.stats.defense > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Defense:</span>
                        <span className="text-blue-400">+{item.stats.defense}</span>
                      </div>
                    )}
                    {item.stats && item.stats.speed !== undefined && item.stats.speed !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Speed:</span>
                        <span className={item.stats.speed > 0 ? 'text-green-400' : 'text-red-400'}>
                          {item.stats.speed > 0 ? '+' : ''}{item.stats.speed}
                        </span>
                      </div>
                    )}
                    {item.stats && item.stats.health && item.stats.health > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Health:</span>
                        <span className="text-green-400">+{item.stats.health}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-yellow-400 font-semibold">
                      {item.price} MWAR
                    </span>
                    <button
                      onClick={() => handleBuyEquipment(item)}
                      className="btn-primary text-sm px-4 py-2"
                    >
                      Buy
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'forge' && (
          <div className="space-y-4">
            {forgeRecipes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔨</div>
                <h4 className="text-xl font-semibold mb-2">Loading Forge...</h4>
                <p className="text-gray-400">Please wait while we load forge recipes</p>
              </div>
            ) : (
              forgeRecipes.map(recipe => (
                <div key={recipe.id} className="glass-panel p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold mb-2">{recipe.name}</h4>
                      <p className="text-gray-400 mb-4">{recipe.description}</p>

                      <div className="mb-4">
                        <h5 className="font-medium mb-2">Requirements:</h5>
                        <div className="space-y-1">
                          {recipe.requirements.map((req: any, index: number) => (
                            <div key={index} className="flex items-center space-x-2 text-sm">
                              <span className="text-gray-300">•</span>
                              <span>{req.quantity}x {req.item || req.resource}</span>
                              {req.resource === 'MWAR' && (
                                <span className="text-yellow-400">💰</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mb-4">
                        <h5 className="font-medium mb-2">Result:</h5>
                        <div className={`inline-block px-3 py-1 rounded ${getRarityColor(recipe.result.rarity)} bg-gray-800`}>
                          {recipe.result.name}
                        </div>
                      </div>
                    </div>

                    <div className="ml-6">
                      <button
                        onClick={() => handleForgeEquipment(recipe)}
                        className="btn-primary"
                      >
                        🔨 Forge
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
