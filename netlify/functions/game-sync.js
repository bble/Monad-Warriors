// Netlify Functions替代WebSocket服务器
// 用于在Netlify环境下提供游戏同步功能

// 使用全局变量模拟持久存储
if (!global.gameState) {
  global.gameState = {
    players: new Map(),
    battles: new Map(),
    lastUpdate: Date.now(),
    initialized: Date.now()
  };
  console.log('🚀 Initializing new game state');
}

const gameState = global.gameState;

// 清理过期数据
function cleanupExpiredData() {
  const now = Date.now();
  const expireTime = 30 * 60 * 1000; // 30分钟过期 (延长过期时间)

  // 清理过期玩家
  const playersToDelete = [];
  for (const [address, player] of gameState.players.entries()) {
    if (now - player.lastUpdate > expireTime) {
      playersToDelete.push(address);
    }
  }
  playersToDelete.forEach(address => gameState.players.delete(address));

  // 清理过期战斗
  const battlesToDelete = [];
  for (const [battleId, battle] of gameState.battles.entries()) {
    if (now - battle.startTime > expireTime) {
      battlesToDelete.push(battleId);
    }
  }
  battlesToDelete.forEach(battleId => gameState.battles.delete(battleId));

  console.log(`Cleaned up ${playersToDelete.length} expired players and ${battlesToDelete.length} expired battles`);
}

exports.handler = async (event, context) => {
  // 设置CORS头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    cleanupExpiredData();

    console.log(`📊 Game state: ${gameState.players.size} players, ${gameState.battles.size} battles`);

    const { httpMethod, body } = event;
    
    if (httpMethod === 'GET') {
      // 返回当前游戏状态
      const playersArray = Array.from(gameState.players.values());
      const battlesArray = Array.from(gameState.battles.values());

      console.log(`📤 Returning game state: ${playersArray.length} players, ${battlesArray.length} battles`);
      console.log('Players:', playersArray.map(p => `${p.address.slice(0,6)}...${p.address.slice(-4)}`));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            players: playersArray,
            battles: battlesArray,
            timestamp: Date.now()
          }
        })
      };
    }

    if (httpMethod === 'POST') {
      const data = JSON.parse(body);
      const { action, payload } = data;

      switch (action) {
        case 'join':
          const { address, heroId } = payload;
          const newPlayer = {
            address,
            heroId,
            position: { x: Math.random() * 1000, y: Math.random() * 1000 },
            status: 'idle',
            lastUpdate: Date.now()
          };
          gameState.players.set(address, newPlayer);
          console.log(`Player joined: ${address}, Total players: ${gameState.players.size}`);
          break;

        case 'leave':
          gameState.players.delete(payload.address);
          break;

        case 'update':
          const player = gameState.players.get(payload.address);
          if (player) {
            gameState.players.set(payload.address, {
              ...player,
              ...payload.updates,
              lastUpdate: Date.now()
            });
          }
          break;

        case 'create-battle':
          const battleId = `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          gameState.battles.set(battleId, {
            id: battleId,
            player1: payload.player1,
            player2: payload.player2,
            hero1Id: payload.hero1Id,
            hero2Id: payload.hero2Id,
            status: 'waiting',
            currentTurn: payload.player1,
            moves: [],
            startTime: Date.now(),
            player1Hp: 100,
            player2Hp: 100,
            maxHp: 100
          });
          
          // 更新玩家状态
          const p1 = gameState.players.get(payload.player1);
          const p2 = gameState.players.get(payload.player2);
          if (p1) gameState.players.set(payload.player1, { ...p1, status: 'battling' });
          if (p2) gameState.players.set(payload.player2, { ...p2, status: 'battling' });
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              data: { battleId }
            })
          };

        case 'battle-move':
          const battle = gameState.battles.get(payload.battleId);
          if (battle && battle.status === 'active') {
            // 简单的战斗逻辑
            const damage = Math.floor(Math.random() * 30) + 10;
            const isPlayer1Turn = battle.currentTurn === battle.player1;
            
            if (isPlayer1Turn) {
              battle.player2Hp = Math.max(0, battle.player2Hp - damage);
            } else {
              battle.player1Hp = Math.max(0, battle.player1Hp - damage);
            }
            
            battle.moves.push({
              player: battle.currentTurn,
              action: payload.action,
              damage,
              timestamp: Date.now()
            });
            
            // 检查战斗是否结束
            if (battle.player1Hp <= 0 || battle.player2Hp <= 0) {
              battle.status = 'completed';
              battle.winner = battle.player1Hp > 0 ? battle.player1 : battle.player2;
              
              // 重置玩家状态
              const p1 = gameState.players.get(battle.player1);
              const p2 = gameState.players.get(battle.player2);
              if (p1) gameState.players.set(battle.player1, { ...p1, status: 'idle' });
              if (p2) gameState.players.set(battle.player2, { ...p2, status: 'idle' });
            } else {
              // 切换回合
              battle.currentTurn = battle.currentTurn === battle.player1 ? battle.player2 : battle.player1;
            }
            
            gameState.battles.set(payload.battleId, battle);
          }
          break;

        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'Unknown action'
            })
          };
      }

      gameState.lastUpdate = Date.now();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            players: Array.from(gameState.players.values()),
            battles: Array.from(gameState.battles.values()),
            timestamp: gameState.lastUpdate
          }
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed'
      })
    };

  } catch (error) {
    console.error('Game sync error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
};
