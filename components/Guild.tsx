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

  // 模拟公会数据
  const mockGuild: Guild = {
    id: '1',
    name: 'Dragon Slayers',
    description: 'Elite warriors dedicated to slaying the mightiest dragons and protecting the realm.',
    level: 8,
    experience: 15420,
    maxExperience: 20000,
    memberCount: 24,
    maxMembers: 30,
    treasury: 45670,
    requirements: {
      minLevel: 5,
      applicationRequired: true
    },
    perks: {
      expBonus: 15,
      rewardBonus: 10,
      battleBonus: 5
    },
    createdAt: '2024-01-15',
    leader: '0x1234567890123456789012345678901234567890'
  };

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

  useEffect(() => {
    // 模拟检查用户是否在公会中
    if (address) {
      setCurrentGuild(mockGuild);
      setGuildMembers(mockMembers);
    }
    setAvailableGuilds(mockAvailableGuilds);
  }, [address]);

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

  const handleJoinGuild = (guild: Guild) => {
    if (guild.requirements.applicationRequired) {
      alert(`Application sent to ${guild.name}!`);
    } else {
      alert(`Joined ${guild.name}!`);
      setCurrentGuild(guild);
      setActiveTab('overview');
    }
  };

  const handleLeaveGuild = () => {
    if (confirm('Are you sure you want to leave the guild?')) {
      setCurrentGuild(null);
      setGuildMembers([]);
      setActiveTab('browse');
    }
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
                      <div className="font-semibold text-yellow-400">{guild.treasury.toLocaleString()} MWAR</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="badge success">+{guild.perks.expBonus}% EXP</span>
                    <span className="badge success">+{guild.perks.rewardBonus}% Rewards</span>
                    <span className="badge success">+{guild.perks.battleBonus}% Battle</span>
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
    </div>
  );
}
