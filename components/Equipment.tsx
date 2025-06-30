import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { GAME_CONSTANTS, getClassIcon, getRarityColor } from '@/utils/web3Config';

interface Equipment {
  id: number;
  name: string;
  type: 'weapon' | 'armor' | 'accessory';
  rarity: number;
  level: number;
  stats: {
    strength?: number;
    intelligence?: number;
    agility?: number;
    vitality?: number;
    luck?: number;
  };
  requirements: {
    level: number;
    class?: number[];
  };
  price: number;
  description: string;
  image: string;
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
  const [isLoading, setIsLoading] = useState(false);

  // 模拟装备数据
  const mockEquipment: Equipment[] = [
    {
      id: 1,
      name: 'Iron Sword',
      type: 'weapon',
      rarity: 0,
      level: 1,
      stats: { strength: 15, agility: 5 },
      requirements: { level: 1, class: [0, 3] }, // Warrior, Assassin
      price: 100,
      description: 'A basic iron sword for beginners.',
      image: '⚔️'
    },
    {
      id: 2,
      name: 'Mystic Staff',
      type: 'weapon',
      rarity: 1,
      level: 3,
      stats: { intelligence: 25, luck: 8 },
      requirements: { level: 3, class: [1, 4] }, // Mage, Priest
      price: 300,
      description: 'A staff imbued with magical energy.',
      image: '🔮'
    },
    {
      id: 3,
      name: 'Elven Bow',
      type: 'weapon',
      rarity: 2,
      level: 5,
      stats: { agility: 30, strength: 10 },
      requirements: { level: 5, class: [2] }, // Archer
      price: 800,
      description: 'A masterfully crafted elven bow.',
      image: '🏹'
    },
    {
      id: 4,
      name: 'Leather Armor',
      type: 'armor',
      rarity: 0,
      level: 1,
      stats: { vitality: 20, agility: 5 },
      requirements: { level: 1 },
      price: 150,
      description: 'Basic leather protection.',
      image: '🛡️'
    },
    {
      id: 5,
      name: 'Dragon Scale Mail',
      type: 'armor',
      rarity: 3,
      level: 10,
      stats: { vitality: 50, strength: 15, intelligence: 10 },
      requirements: { level: 10 },
      price: 2000,
      description: 'Armor forged from ancient dragon scales.',
      image: '🐉'
    },
    {
      id: 6,
      name: 'Lucky Charm',
      type: 'accessory',
      rarity: 1,
      level: 1,
      stats: { luck: 25 },
      requirements: { level: 1 },
      price: 200,
      description: 'Increases your fortune in battle.',
      image: '🍀'
    }
  ];

  // 模拟英雄数据
  const mockHeroes = [
    { tokenId: 1, class: 0, level: 5, name: 'Warrior' },
    { tokenId: 2, class: 1, level: 3, name: 'Mage' },
    { tokenId: 3, class: 2, level: 8, name: 'Archer' }
  ];

  useEffect(() => {
    // 模拟加载用户装备
    setInventory(mockEquipment.slice(0, 3)); // 用户拥有前3个装备
  }, []);

  const canEquip = (equipment: Equipment, heroClass: number, heroLevel: number): boolean => {
    if (equipment.requirements.level > heroLevel) return false;
    if (equipment.requirements.class && !equipment.requirements.class.includes(heroClass)) return false;
    return true;
  };

  const handleEquip = (equipment: Equipment) => {
    const hero = mockHeroes.find(h => h.tokenId === selectedHeroId);
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

      {equipment.requirements.level > 1 && (
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
            disabled={!canEquip(equipment, mockHeroes.find(h => h.tokenId === selectedHeroId)?.class || 0, 
                               mockHeroes.find(h => h.tokenId === selectedHeroId)?.level || 1)}
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
              {mockHeroes.map(hero => (
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
            {mockEquipment.map(equipment => renderEquipmentCard(equipment))}
          </div>
        )}

        {activeTab === 'forge' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔨</div>
            <h4 className="text-xl font-semibold mb-2">Forge Coming Soon</h4>
            <p className="text-gray-400">Upgrade and craft equipment here!</p>
          </div>
        )}
      </div>
    </div>
  );
}
