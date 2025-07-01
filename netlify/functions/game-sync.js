// Netlify Functions替代WebSocket服务器
// 用于在Netlify环境下提供游戏同步功能

const gameState = {
  players: new Map(),
  battles: new Map(),
  lastUpdate: Date.now()
};

// 清理过期数据
function cleanupExpiredData() {
  const now = Date.now();
  const expireTime = 5 * 60 * 1000; // 5分钟过期

  // 清理过期玩家
  for (const [address, player] of gameState.players.entries()) {
    if (now - player.lastUpdate > expireTime) {
      gameState.players.delete(address);
    }
  }

  // 清理过期战斗
  for (const [battleId, battle] of gameState.battles.entries()) {
    if (now - battle.startTime > expireTime) {
      gameState.battles.delete(battleId);
    }
  }
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

    const { httpMethod, body } = event;
    
    if (httpMethod === 'GET') {
      // 返回当前游戏状态
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            players: Array.from(gameState.players.values()),
            battles: Array.from(gameState.battles.values()),
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
          gameState.players.set(address, {
            address,
            heroId,
            position: { x: Math.random() * 1000, y: Math.random() * 1000 },
            status: 'idle',
            lastUpdate: Date.now()
          });
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
