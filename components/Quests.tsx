import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'story' | 'event';
  requirements: {
    type: 'battle' | 'win' | 'mint' | 'collect' | 'level';
    target: number;
    current: number;
  };
  rewards: {
    mwar?: number;
    experience?: number;
    items?: string[];
  };
  status: 'available' | 'in_progress' | 'completed' | 'claimed';
  expiresAt?: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'epic';
}

export default function Quests() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'story' | 'event'>('daily');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 初始化任务数据
  useEffect(() => {
    if (address) {
      initializeQuests();
    }
  }, [address, activeTab]);

  const initializeQuests = () => {
    const allQuests: Quest[] = [
      // Daily Quests
      {
        id: 'daily_battle_1',
        title: 'Daily Warrior',
        description: 'Complete 3 battles today',
        type: 'daily',
        requirements: {
          type: 'battle',
          target: 3,
          current: 1
        },
        rewards: {
          mwar: 100,
          experience: 50
        },
        status: 'in_progress',
        expiresAt: '23:59 today',
        difficulty: 'easy'
      },
      {
        id: 'daily_win_1',
        title: 'Victory Streak',
        description: 'Win 2 battles in a row',
        type: 'daily',
        requirements: {
          type: 'win',
          target: 2,
          current: 0
        },
        rewards: {
          mwar: 150,
          experience: 75
        },
        status: 'available',
        expiresAt: '23:59 today',
        difficulty: 'medium'
      },
      {
        id: 'daily_mint_1',
        title: 'Collector',
        description: 'Mint a new hero',
        type: 'daily',
        requirements: {
          type: 'mint',
          target: 1,
          current: 0
        },
        rewards: {
          mwar: 200,
          experience: 100
        },
        status: 'available',
        expiresAt: '23:59 today',
        difficulty: 'easy'
      },
      // Weekly Quests
      {
        id: 'weekly_battle_1',
        title: 'Battle Master',
        description: 'Complete 20 battles this week',
        type: 'weekly',
        requirements: {
          type: 'battle',
          target: 20,
          current: 8
        },
        rewards: {
          mwar: 1000,
          experience: 500,
          items: ['Rare Equipment Box']
        },
        status: 'in_progress',
        expiresAt: 'Sunday 23:59',
        difficulty: 'hard'
      },
      {
        id: 'weekly_win_1',
        title: 'Champion',
        description: 'Win 15 battles this week',
        type: 'weekly',
        requirements: {
          type: 'win',
          target: 15,
          current: 5
        },
        rewards: {
          mwar: 1500,
          experience: 750,
          items: ['Epic Hero Fragment']
        },
        status: 'in_progress',
        expiresAt: 'Sunday 23:59',
        difficulty: 'epic'
      },
      // Story Quests
      {
        id: 'story_1',
        title: 'The Beginning',
        description: 'Mint your first hero and complete the tutorial',
        type: 'story',
        requirements: {
          type: 'mint',
          target: 1,
          current: 1
        },
        rewards: {
          mwar: 500,
          experience: 200
        },
        status: 'completed',
        difficulty: 'easy'
      },
      {
        id: 'story_2',
        title: 'First Victory',
        description: 'Win your first battle',
        type: 'story',
        requirements: {
          type: 'win',
          target: 1,
          current: 0
        },
        rewards: {
          mwar: 300,
          experience: 150,
          items: ['Starter Equipment']
        },
        status: 'available',
        difficulty: 'easy'
      },
      // Event Quests
      {
        id: 'event_1',
        title: 'New Year Challenge',
        description: 'Special event: Win 10 battles during the New Year event',
        type: 'event',
        requirements: {
          type: 'win',
          target: 10,
          current: 3
        },
        rewards: {
          mwar: 2000,
          experience: 1000,
          items: ['Legendary Hero Fragment', 'Event Badge']
        },
        status: 'in_progress',
        expiresAt: 'Jan 31, 2025',
        difficulty: 'epic'
      }
    ];

    // 根据当前标签页过滤任务
    const filteredQuests = allQuests.filter(quest => quest.type === activeTab);
    setQuests(filteredQuests);
  };

  // 领取任务奖励
  const handleClaimReward = async (questId: string) => {
    try {
      // 这里应该调用智能合约领取奖励
      // 现在先模拟领取过程
      setQuests(prev => prev.map(quest =>
        quest.id === questId
          ? { ...quest, status: 'claimed' as const }
          : quest
      ));

      const quest = quests.find(q => q.id === questId);
      if (quest) {
        let rewardText = '';
        if (quest.rewards.mwar) rewardText += `${quest.rewards.mwar} MWAR `;
        if (quest.rewards.experience) rewardText += `${quest.rewards.experience} EXP `;
        if (quest.rewards.items) rewardText += quest.rewards.items.join(', ');

        alert(`Rewards claimed: ${rewardText}`);
      }
    } catch (error) {
      alert('Failed to claim rewards');
    }
  };

  // 开始任务
  const handleStartQuest = async (questId: string) => {
    try {
      setQuests(prev => prev.map(quest =>
        quest.id === questId
          ? { ...quest, status: 'in_progress' as const }
          : quest
      ));

      alert('Quest started! Check your progress in the quest log.');
    } catch (error) {
      alert('Failed to start quest');
    }
  };



  const getQuestTypeIcon = (type: string): string => {
    switch (type) {
      case 'daily': return '📅';
      case 'weekly': return '📆';
      case 'story': return '📖';
      case 'event': return '🎉';
      default: return '📋';
    }
  };

  const getObjectiveIcon = (type: string): string => {
    switch (type) {
      case 'battle': return '⚔️';
      case 'win': return '🏆';
      case 'mint': return '🎭';
      case 'collect': return '🎒';
      case 'level': return '⬆️';
      default: return '📝';
    }
  };

  const getProgressPercentage = (current: number, target: number): number => {
    return Math.min((current / target) * 100, 100);
  };

  const isQuestCompleted = (quest: Quest): boolean => {
    return quest.requirements.current >= quest.requirements.target;
  };

  const canClaimReward = (quest: Quest): boolean => {
    return isQuestCompleted(quest) && quest.status === 'completed';
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-orange-400';
      case 'epic': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const renderQuestCard = (quest: Quest) => (
    <div key={quest.id} className="glass-panel p-6 hover:bg-gray-800/30 transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getQuestTypeIcon(quest.type)}</span>
          <div>
            <h3 className="text-lg font-semibold">{quest.title}</h3>
            <p className="text-gray-400 text-sm">{quest.description}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`text-xs font-medium ${getDifficultyColor(quest.difficulty)}`}>
                {quest.difficulty.toUpperCase()}
              </span>
              {quest.expiresAt && (
                <span className="text-xs text-gray-500">• Expires: {quest.expiresAt}</span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className={`badge ${quest.status === 'completed' ? 'success' :
                                   quest.status === 'in_progress' ? 'info' :
                                   quest.status === 'claimed' ? 'success' : 'warning'}`}>
            {quest.status.replace('_', ' ')}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getObjectiveIcon(quest.requirements.type)}</span>
            <span className="text-sm">Progress</span>
          </div>
          <div className="text-sm font-semibold">
            {quest.requirements.current}/{quest.requirements.target}
          </div>
        </div>

        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${getProgressPercentage(quest.requirements.current, quest.requirements.target)}%` }}
          ></div>
        </div>
      </div>

      {/* Rewards */}
      <div className="border-t border-gray-600 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold mb-2">Rewards</h4>
            <div className="flex flex-wrap gap-2">
              {quest.rewards.mwar && (
                <span className="badge info">
                  💰 {quest.rewards.mwar} MWAR
                </span>
              )}
              {quest.rewards.experience && (
                <span className="badge info">
                  ⭐ {quest.rewards.experience} EXP
                </span>
              )}
              {quest.rewards.items && quest.rewards.items.length > 0 && (
                <span className="badge warning">
                  🎁 {quest.rewards.items.join(', ')}
                </span>
              )}
            </div>
          </div>
          
          <div>
            {quest.status === 'available' ? (
              <button
                onClick={() => handleStartQuest(quest.id)}
                className="btn-primary"
              >
                Start Quest
              </button>
            ) : quest.status === 'completed' ? (
              <button
                onClick={() => handleClaimReward(quest.id)}
                className="btn-primary"
              >
                Claim Reward
              </button>
            ) : quest.status === 'claimed' ? (
              <button className="btn-secondary" disabled>
                ✅ Claimed
              </button>
            ) : (
              <button className="btn-secondary" disabled>
                In Progress
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold">📋 Quests & Missions</h2>
          
          <div className="text-sm text-gray-400">
            Complete quests to earn rewards and progress in the game
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-800 rounded-lg p-1 mt-4">
          {[
            { key: 'daily', label: 'Daily', icon: '📅' },
            { key: 'weekly', label: 'Weekly', icon: '📆' },
            { key: 'story', label: 'Story', icon: '📖' },
            { key: 'event', label: 'Event', icon: '🎉' }
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

      {/* Quest Progress Summary */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold mb-4">📊 Progress Summary</h3>
        
        <div className="grid md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">12</div>
            <div className="text-sm text-gray-400">Completed Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">8</div>
            <div className="text-sm text-gray-400">Active Quests</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">2,340</div>
            <div className="text-sm text-gray-400">Total MWAR Earned</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">1,560</div>
            <div className="text-sm text-gray-400">Total EXP Earned</div>
          </div>
        </div>
      </div>

      {/* Quest List */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {activeTab === 'daily' ? '📅 Daily Quests' :
             activeTab === 'weekly' ? '📆 Weekly Quests' :
             activeTab === 'story' ? '📖 Story Missions' : '🎉 Event Quests'}
          </h3>
          <div className="text-sm text-gray-400">
            {quests.length} quests available
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="loading-spinner"></div>
            <span className="ml-2">Loading quests...</span>
          </div>
        ) : quests.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h4 className="text-xl font-semibold mb-2">No Quests Available</h4>
            <p className="text-gray-400">
              {activeTab === 'daily' ? 'Daily quests reset every 24 hours.' :
               activeTab === 'weekly' ? 'Weekly quests reset every Monday.' :
               activeTab === 'story' ? 'Complete previous story missions to unlock more.' :
               'No events are currently active.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {quests.map(renderQuestCard)}
          </div>
        )}
      </div>

      {/* Quest Tips */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold mb-4">💡 Quest Tips</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
            <h4 className="font-semibold mb-2">📅 Daily Quests</h4>
            <p className="text-sm text-gray-300">
              Reset every 24 hours. Focus on these for consistent rewards and progression.
            </p>
          </div>
          
          <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
            <h4 className="font-semibold mb-2">📆 Weekly Quests</h4>
            <p className="text-sm text-gray-300">
              Offer larger rewards but require more time. Plan your week accordingly.
            </p>
          </div>
          
          <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4">
            <h4 className="font-semibold mb-2">📖 Story Missions</h4>
            <p className="text-sm text-gray-300">
              Unlock new features and areas. Complete them to progress in the game.
            </p>
          </div>
          
          <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4">
            <h4 className="font-semibold mb-2">🎉 Event Quests</h4>
            <p className="text-sm text-gray-300">
              Limited-time quests with exclusive rewards. Don't miss out!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
