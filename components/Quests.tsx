import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { gameDataManager, Quest, QuestObjective } from '@/utils/gameData';

export default function Quests() {
  const { address } = useAccount();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'story' | 'event'>('daily');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadQuests();
  }, [activeTab]);

  const loadQuests = () => {
    setIsLoading(true);
    setTimeout(() => {
      const allQuests = gameDataManager.getQuests();
      const filteredQuests = allQuests.filter(quest => quest.type === activeTab);
      setQuests(filteredQuests);
      setIsLoading(false);
    }, 300);
  };

  const handleClaimReward = (questId: string) => {
    const quest = quests.find(q => q.id === questId);
    if (!quest) return;

    // 模拟领取奖励
    alert(`Claimed rewards: ${quest.rewards.mwar} MWAR, ${quest.rewards.experience} EXP!`);
    
    // 更新任务状态
    setQuests(prev => prev.map(q => 
      q.id === questId ? { ...q, status: 'completed' } : q
    ));
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
      case 'collect': return '🎒';
      case 'level': return '⬆️';
      case 'social': return '👥';
      default: return '📝';
    }
  };

  const getProgressPercentage = (current: number, target: number): number => {
    return Math.min((current / target) * 100, 100);
  };

  const isQuestCompleted = (quest: Quest): boolean => {
    return quest.objectives.every(obj => obj.completed);
  };

  const canClaimReward = (quest: Quest): boolean => {
    return isQuestCompleted(quest) && quest.status !== 'completed';
  };

  const renderQuestCard = (quest: Quest) => (
    <div key={quest.id} className="glass-panel p-6 hover:bg-gray-800/30 transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getQuestTypeIcon(quest.type)}</span>
          <div>
            <h3 className="text-lg font-semibold">{quest.name}</h3>
            <p className="text-gray-400 text-sm">{quest.description}</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`badge ${quest.status === 'completed' ? 'success' : 
                                   quest.status === 'active' ? 'info' : 
                                   quest.status === 'expired' ? 'error' : 'warning'}`}>
            {quest.status}
          </div>
          {quest.type === 'daily' && (
            <div className="text-xs text-gray-400 mt-1">Resets in 12h</div>
          )}
          {quest.type === 'weekly' && (
            <div className="text-xs text-gray-400 mt-1">Resets in 3d</div>
          )}
        </div>
      </div>

      {/* Objectives */}
      <div className="space-y-3 mb-4">
        {quest.objectives.map((objective) => (
          <div key={objective.id} className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getObjectiveIcon(objective.type)}</span>
                <span className="text-sm">{objective.description}</span>
              </div>
              <div className="text-sm font-semibold">
                {objective.current}/{objective.target}
              </div>
            </div>
            
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${getProgressPercentage(objective.current, objective.target)}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* Rewards */}
      <div className="border-t border-gray-600 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold mb-2">Rewards</h4>
            <div className="flex flex-wrap gap-2">
              <span className="badge info">
                💰 {quest.rewards.mwar} MWAR
              </span>
              <span className="badge info">
                ⭐ {quest.rewards.experience} EXP
              </span>
              {quest.rewards.items && quest.rewards.items.length > 0 && (
                <span className="badge warning">
                  🎁 {quest.rewards.items.length} Items
                </span>
              )}
            </div>
          </div>
          
          <div>
            {canClaimReward(quest) ? (
              <button
                onClick={() => handleClaimReward(quest.id)}
                className="btn-primary"
              >
                Claim Reward
              </button>
            ) : quest.status === 'completed' ? (
              <button className="btn-secondary" disabled>
                Completed
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
