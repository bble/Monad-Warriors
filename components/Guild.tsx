import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { GAME_CONSTANTS, getClassIcon, getRarityColor } from '@/utils/web3Config';

interface GuildMember {
  address: string;
  name: string;
  role: 'leader' | 'officer' | 'member';
  level: number;
  contribution: number;
  joinedAt: string;
  lastActive: string;
  favoriteHero: {
    class: number;
    rarity: number;
  };
}

interface Guild {
  id: string;
  name: string;
  description: string;
  level: number;
  experience: number;
  maxExperience: number;
  memberCount: number;
  maxMembers: number;
  treasury: number;
  requirements: {
    minLevel: number;
    applicationRequired: boolean;
  };
  perks: {
    expBonus: number;
    rewardBonus: number;
    battleBonus: number;
  };
  createdAt: string;
  leader: string;
}

export default function Guild() {
  const { address } = useAccount();
  const [currentGuild, setCurrentGuild] = useState<Guild | null>(null);
  const [guildMembers, setGuildMembers] = useState<GuildMember[]>([]);
  const [availableGuilds, setAvailableGuilds] = useState<Guild[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'treasury' | 'browse'>('overview');
  const [isLoading, setIsLoading] = useState(false);

  // 初始化公会数据
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGuildName, setNewGuildName] = useState('');
  const [newGuildDescription, setNewGuildDescription] = useState('');

  // 加载公会数据
  const loadGuildData = async () => {
    if (!address) return;

    try {
      // 获取玩家当前公会
      const playerGuildResponse = await fetch('/api/guild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getPlayerGuild',
          player: address
        })
      });

      if (playerGuildResponse.ok) {
        const playerGuildResult = await playerGuildResponse.json();
        if (playerGuildResult.guild) {
          setCurrentGuild({
            id: playerGuildResult.guild.id,
            name: playerGuildResult.guild.name,
            description: playerGuildResult.guild.description,
            memberCount: parseInt(playerGuildResult.guild.memberCount),
            maxMembers: 50, // 默认最大成员数
            level: parseInt(playerGuildResult.guild.level),
            treasury: BigInt(Math.floor(parseFloat(playerGuildResult.guild.treasury) * 1e18)),
            leader: playerGuildResult.guild.leader,
            createdAt: parseInt(playerGuildResult.guild.createdAt) * 1000,
            requirements: {
              minLevel: 1,
              applicationRequired: false,
              minPower: 0
            },
            bonuses: {
              battleReward: 5,
              questReward: 5,
              experienceBonus: 5
            }
          });
        }
      }

      // 获取所有活跃公会
      const guildsResponse = await fetch('/api/guild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getActiveGuilds'
        })
      });

      if (guildsResponse.ok) {
        const guildsResult = await guildsResponse.json();
        if (guildsResult.guilds && guildsResult.guilds.length > 0) {
          const guilds = guildsResult.guilds.map((guild: any) => ({
            id: guild.id,
            name: guild.name,
            description: guild.description,
            memberCount: parseInt(guild.memberCount),
            maxMembers: 50,
            level: parseInt(guild.level),
            treasury: BigInt(Math.floor(parseFloat(guild.treasury) * 1e18)),
            leader: guild.leader,
            createdAt: parseInt(guild.createdAt) * 1000,
            requirements: {
              minLevel: 1,
              applicationRequired: false,
              minPower: 0
            },
            bonuses: {
              battleReward: 5,
              questReward: 5,
              experienceBonus: 5
            }
          }));
          setAvailableGuilds(guilds);
        }
      }
    } catch (error) {
      console.error('Failed to load guild data:', error);
      // 如果API调用失败，不做任何操作，让备用数据生效
    }
  };

  // 初始化公会数据
  useEffect(() => {
    if (address) {
      // 加载真实的公会数据
      loadGuildData().catch(() => {
        // 如果智能合约调用失败，使用备用模拟数据
        console.log('Using fallback guild data');
      });

      // 设置备用模拟数据
      const mockGuilds: Guild[] = [
        {
          id: '1',
          name: 'Dragon Slayers',
          description: 'Elite warriors dedicated to slaying the mightiest dragons',
          memberCount: 45,
          maxMembers: 50,
          level: 8,
          treasury: BigInt('15000000000000000000000'), // 15000 MWAR
          leader: '0x1234567890123456789012345678901234567890',
          createdAt: Date.now() - 86400000 * 30, // 30 days ago
          requirements: {
            minLevel: 10,
            applicationRequired: false,
            minPower: 1000
          },
          bonuses: {
            battleReward: 15,
            questReward: 20,
            experienceBonus: 10
          }
        },
        {
          id: '2',
          name: 'Mystic Scholars',
          description: 'Seekers of ancient knowledge and magical artifacts',
          memberCount: 32,
          maxMembers: 40,
          level: 6,
          treasury: BigInt('8500000000000000000000'), // 8500 MWAR
          leader: '0x2345678901234567890123456789012345678901',
          createdAt: Date.now() - 86400000 * 15, // 15 days ago
          requirements: {
            minLevel: 5,
            applicationRequired: true,
            minPower: 500
          },
          bonuses: {
            battleReward: 10,
            questReward: 25,
            experienceBonus: 15
          }
        },
        {
          id: '3',
          name: 'Shadow Assassins',
          description: 'Masters of stealth and precision strikes',
          memberCount: 28,
          maxMembers: 35,
          level: 7,
          treasury: BigInt('12000000000000000000000'), // 12000 MWAR
          leader: '0x3456789012345678901234567890123456789012',
          createdAt: Date.now() - 86400000 * 20, // 20 days ago
          requirements: {
            minLevel: 8,
            applicationRequired: true,
            minPower: 800
          },
          bonuses: {
            battleReward: 20,
            questReward: 10,
            experienceBonus: 5
          }
        }
      ];

      setAvailableGuilds(mockGuilds);

      // 检查用户是否已经在公会中
      const userGuildId = localStorage.getItem(`guild_${address}`);
      if (userGuildId) {
        const userGuild = mockGuilds.find(g => g.id === userGuildId);
        if (userGuild) {
          setCurrentGuild(userGuild);
          // 模拟公会成员数据
          setGuildMembers([
            {
              address: address,
              name: 'You',
              role: 'member',
              level: 15,
              contribution: 1250,
              joinedAt: 'Last week',
              lastActive: 'Now'
            },
            {
              address: userGuild.leader,
              name: 'Guild Leader',
              role: 'leader',
              level: 25,
              contribution: 5000,
              joinedAt: '1 month ago',
              lastActive: '1 hour ago'
            },
            {
              address: '0x4567890123456789012345678901234567890123',
              name: 'Officer Alpha',
              role: 'officer',
              level: 22,
              contribution: 3200,
              joinedAt: '3 weeks ago',
              lastActive: '2 hours ago'
            },
            {
              address: '0x5678901234567890123456789012345678901234',
              name: 'Veteran Member',
              role: 'member',
              level: 18,
              contribution: 2100,
              joinedAt: '2 weeks ago',
              lastActive: '1 day ago'
            }
          ]);
        }
      }

      // 设置备用可用公会数据（总是显示，即使智能合约调用失败）
      setAvailableGuilds(mockGuilds);
    }
  }, [address]);

  const mockMembers: GuildMember[] = [
    {
      address: '0x1234567890123456789012345678901234567890',
      name: 'DragonSlayer',
      role: 'leader',
      level: 25,
      contribution: 8950,
      joinedAt: '2024-01-15',
      lastActive: '2 hours ago',
      favoriteHero: { class: 0, rarity: 3 }
    },
    {
      address: '0x2345678901234567890123456789012345678901',
      name: 'MysticMage',
      role: 'officer',
      level: 22,
      contribution: 7230,
      joinedAt: '2024-01-18',
      lastActive: '1 hour ago',
      favoriteHero: { class: 1, rarity: 2 }
    },
    {
      address: '0x3456789012345678901234567890123456789012',
      name: 'ShadowArcher',
      role: 'officer',
      level: 20,
      contribution: 6540,
      joinedAt: '2024-01-22',
      lastActive: '30 minutes ago',
      favoriteHero: { class: 2, rarity: 2 }
    },
    {
      address: address || '0x4567890123456789012345678901234567890123',
      name: 'You',
      role: 'member',
      level: 15,
      contribution: 3420,
      joinedAt: '2024-02-01',
      lastActive: 'Now',
      favoriteHero: { class: 0, rarity: 1 }
    }
  ];

  const mockAvailableGuilds: Guild[] = [
    {
      id: '2',
      name: 'Mystic Order',
      description: 'Masters of magic and ancient wisdom.',
      level: 6,
      experience: 8500,
      maxExperience: 12000,
      memberCount: 18,
      maxMembers: 25,
      treasury: 28340,
      requirements: { minLevel: 3, applicationRequired: false },
      perks: { expBonus: 10, rewardBonus: 8, battleBonus: 3 },
      createdAt: '2024-02-01',
      leader: '0x5678901234567890123456789012345678901234'
    },
    {
      id: '3',
      name: 'Shadow Hunters',
      description: 'Elite assassins and stealth specialists.',
      level: 10,
      experience: 18900,
      maxExperience: 25000,
      memberCount: 15,
      maxMembers: 20,
      treasury: 67890,
      requirements: { minLevel: 8, applicationRequired: true },
      perks: { expBonus: 20, rewardBonus: 15, battleBonus: 8 },
      createdAt: '2024-01-10',
      leader: '0x6789012345678901234567890123456789012345'
    }
  ];

  // 移除重复的useEffect，真实数据加载在上面的useEffect中处理
  // 如果智能合约调用失败，会自动使用备用的模拟数据

  const getRoleIcon = (role: string): string => {
    switch (role) {
      case 'leader': return '👑';
      case 'officer': return '⭐';
      case 'member': return '👤';
      default: return '👤';
    }
  };

  const getRoleColor = (role: string): string => {
    switch (role) {
      case 'leader': return 'text-yellow-400';
      case 'officer': return 'text-blue-400';
      case 'member': return 'text-gray-300';
      default: return 'text-gray-300';
    }
  };

  const handleJoinGuild = async (guild: Guild) => {
    if (!address) {
      alert('Please connect your wallet');
      return;
    }

    try {
      const response = await fetch('/api/guild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'joinGuild',
          player: address,
          guildId: guild.id
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert(`Successfully joined ${guild.name}! Transaction: ${result.txHash}`);
          // 重新加载公会数据
          await loadGuildData();
          setActiveTab('overview');
        } else {
          // 显示友好的错误消息
          if (result.error.includes('not deployed')) {
            alert('Guild system is coming soon! The smart contracts are being deployed.');
          } else {
            alert(`Failed to join guild: ${result.error}`);
          }
        }
      } else {
        alert('Failed to join guild');
      }
    } catch (error) {
      console.error('Join guild error:', error);
      alert('Guild system is temporarily unavailable. Please try again later.');
    }
  };

  const handleLeaveGuild = () => {
    if (confirm('Are you sure you want to leave the guild?')) {
      localStorage.removeItem(`guild_${address}`);
      setCurrentGuild(null);
      setGuildMembers([]);
      setActiveTab('browse');
    }
  };

  const handleCreateGuild = async () => {
    if (!newGuildName.trim()) {
      alert('Please enter a guild name');
      return;
    }

    if (!address) {
      alert('Please connect your wallet');
      return;
    }

    try {
      const response = await fetch('/api/guild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createGuild',
          player: address,
          guildName: newGuildName.trim(),
          description: newGuildDescription.trim() || 'A new guild ready for adventure!'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert(`Guild "${newGuildName}" created successfully! Transaction: ${result.txHash}`);

          // 重置表单并关闭模态框
          setNewGuildName('');
          setNewGuildDescription('');
          setShowCreateModal(false);
          setActiveTab('overview');

          // 重新加载公会数据
          await loadGuildData();
        } else {
          // 显示友好的错误消息
          if (result.error.includes('not deployed')) {
            alert('Guild system is coming soon! The smart contracts are being deployed.');
          } else {
            alert(`Failed to create guild: ${result.error}`);
          }
        }
      } else {
        alert('Failed to create guild');
      }
    } catch (error) {
      console.error('Create guild error:', error);
      alert('Guild system is temporarily unavailable. Please try again later.');
    }

    alert(`Guild "${newGuild.name}" created successfully!`);
  };

  const formatAddress = (addr: string): string => {
    if (addr === address) return 'You';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!currentGuild && activeTab !== 'browse') {
    return (
      <div className="space-y-6">
        <div className="glass-panel p-8 text-center">
          <div className="text-6xl mb-4">🏰</div>
          <h2 className="text-2xl font-bold mb-4">Join a Guild</h2>
          <p className="text-gray-400 mb-6">
            Guilds provide bonuses, social features, and collaborative gameplay. Find one that suits your playstyle!
          </p>
          <button
            onClick={() => setActiveTab('browse')}
            className="btn-primary"
          >
            Browse Guilds
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              🏰 {currentGuild ? currentGuild.name : 'Guild System'}
            </h2>
            {currentGuild && (
              <p className="text-gray-400 mt-1">{currentGuild.description}</p>
            )}
          </div>
          
          {currentGuild && (
            <div className="flex space-x-2">
              <button className="btn-secondary">
                Guild Settings
              </button>
              <button
                onClick={handleLeaveGuild}
                className="btn-danger"
              >
                Leave Guild
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-800 rounded-lg p-1 mt-4">
          {[
            { key: 'overview', label: 'Overview', icon: '📊' },
            { key: 'members', label: 'Members', icon: '👥' },
            { key: 'treasury', label: 'Treasury', icon: '💰' },
            { key: 'browse', label: 'Browse Guilds', icon: '🔍' }
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

      {/* Tab Content */}
      {activeTab === 'overview' && currentGuild && (
        <div className="space-y-6">
          {/* Guild Stats */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold mb-4">Guild Information</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Guild Level</span>
                    <span className="font-bold text-yellow-400">Level {currentGuild.level}</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${(currentGuild.experience / currentGuild.maxExperience) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {currentGuild.experience.toLocaleString()} / {currentGuild.maxExperience.toLocaleString()} XP
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400">Members</div>
                    <div className="font-bold">{currentGuild.memberCount}/{currentGuild.maxMembers}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Treasury</div>
                    <div className="font-bold text-yellow-400">{currentGuild.treasury.toLocaleString()} MWAR</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Guild Perks</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Experience Bonus</span>
                    <span className="text-green-400">+{currentGuild.perks.expBonus}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Reward Bonus</span>
                    <span className="text-green-400">+{currentGuild.perks.rewardBonus}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Battle Bonus</span>
                    <span className="text-green-400">+{currentGuild.perks.battleBonus}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm">
                <span className="text-green-400">✓</span>
                <span>DragonSlayer completed a raid and earned 500 guild XP</span>
                <span className="text-gray-400 ml-auto">2 hours ago</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <span className="text-blue-400">👤</span>
                <span>ShadowArcher joined the guild</span>
                <span className="text-gray-400 ml-auto">1 day ago</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <span className="text-yellow-400">⬆️</span>
                <span>Guild reached level 8!</span>
                <span className="text-gray-400 ml-auto">3 days ago</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'members' && currentGuild && (
        <div className="glass-panel p-6">
          <h3 className="text-lg font-semibold mb-4">Guild Members ({guildMembers.length})</h3>
          
          <div className="space-y-2">
            {guildMembers.map((member) => (
              <div
                key={member.address}
                className={`flex items-center justify-between p-4 rounded-lg transition-all duration-200 hover:bg-gray-800/50 ${
                  member.address === address ? 'bg-blue-900/30 border border-blue-500/30' : ''
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{getRoleIcon(member.role)}</span>
                    <span className="text-xl">{getClassIcon(member.favoriteHero.class)}</span>
                  </div>
                  
                  <div>
                    <div className="font-semibold">{member.name}</div>
                    <div className="text-sm text-gray-400">
                      {formatAddress(member.address)} • 
                      <span className={`ml-1 ${getRoleColor(member.role)}`}>
                        {member.role}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-semibold">Level {member.level}</div>
                  <div className="text-sm text-gray-400">
                    {member.contribution.toLocaleString()} contribution
                  </div>
                  <div className="text-xs text-gray-500">
                    Last active: {member.lastActive}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'treasury' && currentGuild && (
        <div className="glass-panel p-6">
          <h3 className="text-lg font-semibold mb-4">Guild Treasury</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Current Balance</h4>
              <div className="text-3xl font-bold text-yellow-400 mb-4">
                {currentGuild.treasury.toLocaleString()} MWAR
              </div>
              
              <div className="space-y-2">
                <button className="btn-primary w-full">
                  Contribute to Treasury
                </button>
                <button className="btn-secondary w-full">
                  Request Withdrawal
                </button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Recent Transactions</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-400">+500 MWAR</span>
                  <span className="text-gray-400">DragonSlayer contribution</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-400">-200 MWAR</span>
                  <span className="text-gray-400">Guild upgrade</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-400">+300 MWAR</span>
                  <span className="text-gray-400">MysticMage contribution</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'browse' && (
        <div className="space-y-4">
          {/* Create Guild Button */}
          <div className="glass-panel p-6 text-center">
            <h3 className="text-lg font-semibold mb-4">Create Your Own Guild</h3>
            <p className="text-gray-400 mb-4">Start your own guild and recruit members!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
              disabled={currentGuild !== null}
            >
              Create New Guild
            </button>
          </div>

          {availableGuilds.map((guild) => (
            <div key={guild.id} className="glass-panel p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-bold">{guild.name}</h3>
                    <span className="badge info">Level {guild.level}</span>
                  </div>
                  
                  <p className="text-gray-400 mb-4">{guild.description}</p>
                  
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-400">Members</div>
                      <div className="font-semibold">{guild.memberCount}/{guild.maxMembers}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Min Level</div>
                      <div className="font-semibold">{guild.requirements.minLevel}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Treasury</div>
                      <div className="font-semibold text-yellow-400">{(Number(guild.treasury) / 1e18).toFixed(0)} MWAR</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="badge success">+{guild.bonuses.experienceBonus}% EXP</span>
                    <span className="badge success">+{guild.bonuses.questReward}% Quest</span>
                    <span className="badge success">+{guild.bonuses.battleReward}% Battle</span>
                    {guild.requirements.applicationRequired && (
                      <span className="badge warning">Application Required</span>
                    )}
                  </div>
                </div>

                <div className="ml-6">
                  <button
                    onClick={() => handleJoinGuild(guild)}
                    className="btn-primary"
                    disabled={currentGuild !== null}
                  >
                    {guild.requirements.applicationRequired ? 'Apply' : 'Join'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Guild Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="glass-panel p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Create New Guild</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Guild Name</label>
                <input
                  type="text"
                  value={newGuildName}
                  onChange={(e) => setNewGuildName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Enter guild name..."
                  maxLength={30}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <textarea
                  value={newGuildDescription}
                  onChange={(e) => setNewGuildDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Describe your guild..."
                  rows={3}
                  maxLength={200}
                />
              </div>

              <div className="text-sm text-gray-400">
                <p>• Guild creation is free</p>
                <p>• You will become the guild leader</p>
                <p>• Starting capacity: 20 members</p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGuild}
                className="btn-primary flex-1"
                disabled={!newGuildName.trim()}
              >
                Create Guild
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
