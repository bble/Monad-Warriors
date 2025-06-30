import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useGameSync } from '../hooks/useGameSync';
import { GAME_CONSTANTS, getClassIcon, getRarityColor } from '@/utils/web3Config';

export default function GameLobby() {
  const { address } = useAccount();
  const {
    isConnected,
    onlinePlayers,
    activeBattles,
    currentBattle,
    playerState,
    joinGame,
    leaveGame,
    findMatch,
    createBattle,
    makeBattleMove,
  } = useGameSync();

  const [selectedHeroId, setSelectedHeroId] = useState<number>(1);
  const [challengeTarget, setChallengeTarget] = useState<string>('');
  const [battleAction, setBattleAction] = useState<'attack' | 'defend' | 'special'>('attack');
  const [userHeroes, setUserHeroes] = useState<any[]>([]);

  // 获取用户的英雄数据
  useEffect(() => {
    const fetchUserHeroes = async () => {
      if (!address) return;

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

          // 获取每个英雄的详细信息
          for (let i = 0; i < Math.min(Number(balance), 10); i++) { // 限制最多10个英雄
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
                    rarity: Number(attributes.rarity),
                    class: Number(attributes.class),
                    level: Number(attributes.level),
                    power: Number(attributes.strength) + Number(attributes.intelligence) +
                           Number(attributes.agility) + Number(attributes.vitality) + Number(attributes.luck)
                  });
                }
              }
            } catch (error) {
              continue;
            }
          }

          setUserHeroes(heroList);
          if (heroList.length > 0) {
            setSelectedHeroId(heroList[0].tokenId);
          }
        }
      } catch (error) {
        // 静默处理错误
      }
    };

    fetchUserHeroes();
  }, [address]);

  const handleJoinLobby = () => {
    joinGame(selectedHeroId);
  };

  const handleLeaveLobby = () => {
    leaveGame();
  };

  const handleQuickMatch = () => {
    const opponent = findMatch();
    if (opponent) {
      createBattle(opponent.address, opponent.heroId);
    } else {
      alert('No available opponents found. Try again later!');
    }
  };

  const handleChallenge = (targetAddress: string, targetHeroId: number) => {
    createBattle(targetAddress, targetHeroId);
  };

  const handleBattleAction = () => {
    if (currentBattle) {
      makeBattleMove(currentBattle.id, battleAction);
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="font-semibold">
              MultiSYNQ Status: {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="text-sm text-gray-400">
            {onlinePlayers.length} players online • {activeBattles.length} active battles
          </div>
        </div>
      </div>

      {!playerState ? (
        /* Join Lobby */
        <div className="glass-panel p-6">
          <h3 className="text-xl font-semibold mb-4">Join Game Lobby</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Your Hero</label>
            <div className="grid md:grid-cols-3 gap-4">
              {userHeroes.map((hero) => (
                <button
                  key={hero.tokenId}
                  onClick={() => setSelectedHeroId(hero.tokenId)}
                  className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                    selectedHeroId === hero.tokenId
                      ? 'border-blue-400 bg-blue-400/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">{getClassIcon(hero.class)}</span>
                    <div className="text-left">
                      <div className="font-semibold">
                        {GAME_CONSTANTS.CLASS_NAMES[hero.class]}
                      </div>
                      <div className={`text-sm ${getRarityColor(hero.rarity)}`}>
                        {GAME_CONSTANTS.RARITY_NAMES[hero.rarity]}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Level {hero.level}</span>
                    <span className="text-yellow-400">⚡ {hero.power}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleJoinLobby}
            disabled={!isConnected}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnected ? 'Join Lobby' : 'Connecting...'}
          </button>
        </div>
      ) : (
        /* Game Lobby Interface */
        <>
          {/* Player Status */}
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Game Lobby</h3>
              <button
                onClick={handleLeaveLobby}
                className="btn-secondary text-sm py-2 px-4"
              >
                Leave Lobby
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{getClassIcon(userHeroes.find(h => h.tokenId === playerState.heroId)?.class || 0)}</span>
                <div>
                  <div className="font-semibold">Your Hero</div>
                  <div className="text-sm text-gray-400">
                    Status: <span className={`${
                      playerState.status === 'idle' ? 'text-green-400' :
                      playerState.status === 'battling' ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {playerState.status}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-gray-400">
                Position: ({Math.round(playerState.position.x)}, {Math.round(playerState.position.y)})
              </div>
            </div>
          </div>

          {/* Quick Match */}
          <div className="glass-panel p-6">
            <h3 className="text-xl font-semibold mb-4">Quick Match</h3>
            <p className="text-gray-400 mb-4">
              Find a random opponent for instant battle!
            </p>
            <button
              onClick={handleQuickMatch}
              disabled={playerState.status !== 'idle'}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {playerState.status === 'idle' ? 'Find Match' : 'Currently Busy'}
            </button>
          </div>

          {/* Online Players */}
          <div className="glass-panel p-6">
            <h3 className="text-xl font-semibold mb-4">Online Players ({onlinePlayers.length})</h3>
            
            {onlinePlayers.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No other players online. Invite friends to join!
              </div>
            ) : (
              <div className="space-y-3">
                {onlinePlayers
                  .filter(player => player.address !== playerState.address)
                  .map((player) => (
                    <div
                      key={player.address}
                      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{getClassIcon(userHeroes.find(h => h.tokenId === player.heroId)?.class || 0)}</span>
                        <div>
                          <div className="font-mono text-sm">
                            {player.address.slice(0, 6)}...{player.address.slice(-4)}
                          </div>
                          <div className="text-xs text-gray-400">
                            Hero #{player.heroId} • {player.status}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleChallenge(player.address, player.heroId)}
                        disabled={player.status !== 'idle' || playerState.status !== 'idle'}
                        className="btn-primary text-sm py-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Challenge
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Current Battle */}
          {currentBattle && (
            <div className="glass-panel p-6 battle-arena">
              <h3 className="text-xl font-semibold mb-4">Active Battle</h3>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-lg font-semibold mb-2">
                    {currentBattle.player1 === playerState.address ? 'You' : 'Opponent'}
                  </div>
                  <div className="text-sm text-gray-400">
                    Hero #{currentBattle.hero1Id}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-semibold mb-2">
                    {currentBattle.player2 === playerState.address ? 'You' : 'Opponent'}
                  </div>
                  <div className="text-sm text-gray-400">
                    Hero #{currentBattle.hero2Id}
                  </div>
                </div>
              </div>

              <div className="text-center mb-4">
                <div className="text-sm text-gray-400">Current Turn</div>
                <div className="text-lg font-semibold">
                  {currentBattle.currentTurn === playerState.address ? 'Your Turn' : "Opponent's Turn"}
                </div>
              </div>

              {currentBattle.currentTurn === playerState.address && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Choose Action</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['attack', 'defend', 'special'] as const).map((action) => (
                        <button
                          key={action}
                          onClick={() => setBattleAction(action)}
                          className={`p-2 rounded border-2 transition-all duration-300 ${
                            battleAction === action
                              ? 'border-blue-400 bg-blue-400/20'
                              : 'border-gray-600 hover:border-gray-500'
                          }`}
                        >
                          {action.charAt(0).toUpperCase() + action.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <button
                    onClick={handleBattleAction}
                    className="btn-primary w-full"
                  >
                    Execute {battleAction.charAt(0).toUpperCase() + battleAction.slice(1)}
                  </button>
                </div>
              )}

              {/* Battle Log */}
              <div className="mt-6">
                <h4 className="font-semibold mb-2">Battle Log</h4>
                <div className="bg-gray-900/50 rounded p-3 max-h-32 overflow-y-auto">
                  {currentBattle.moves.length === 0 ? (
                    <div className="text-gray-400 text-sm">Battle starting...</div>
                  ) : (
                    currentBattle.moves.map((move, index) => (
                      <div key={index} className="text-sm mb-1">
                        <span className="text-blue-400">
                          {move.playerId === playerState.address ? 'You' : 'Opponent'}
                        </span>
                        <span className="text-gray-300"> used </span>
                        <span className="text-yellow-400">{move.action}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Active Battles List */}
          <div className="glass-panel p-6">
            <h3 className="text-xl font-semibold mb-4">Active Battles ({activeBattles.length})</h3>
            
            {activeBattles.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                No active battles
              </div>
            ) : (
              <div className="space-y-2">
                {activeBattles.map((battle) => (
                  <div
                    key={battle.id}
                    className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
                  >
                    <div className="text-sm">
                      <span className="font-mono">
                        {battle.player1.slice(0, 6)}...{battle.player1.slice(-4)}
                      </span>
                      <span className="text-gray-400"> vs </span>
                      <span className="font-mono">
                        {battle.player2.slice(0, 6)}...{battle.player2.slice(-4)}
                      </span>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${
                      battle.status === 'active' ? 'bg-green-600' :
                      battle.status === 'waiting' ? 'bg-yellow-600' : 'bg-gray-600'
                    }`}>
                      {battle.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
