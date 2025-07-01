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

  console.log(`🔥 Netlify Function called: ${event.httpMethod} ${event.path}`);
  console.log(`📝 Request body:`, event.body);

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
      console.log(`📨 Processing POST request with body:`, body);

      if (!body) {
        console.error('❌ No request body provided');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'No request body provided' })
        };
      }

      const data = JSON.parse(body);
      const { action, payload } = data;

      console.log(`🎯 Action: ${action}, Payload:`, payload);

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
          const leavingAddress = payload.address;
          console.log(`🚪 Player leaving: ${leavingAddress}`);

          // 删除玩家
          gameState.players.delete(leavingAddress);
          console.log(`✅ Player removed from players map: ${leavingAddress}`);

          // 清理相关的战斗记录
          const battlesToRemove = [];
          for (const [battleId, battle] of gameState.battles.entries()) {
            if (battle.player1 === leavingAddress || battle.player2 === leavingAddress) {
              battlesToRemove.push(battleId);
              console.log(`🗑️ Marking battle for removal: ${battleId} (involves ${leavingAddress})`);
            }
          }

          // 删除相关战斗
          battlesToRemove.forEach(battleId => {
            gameState.battles.delete(battleId);
            console.log(`✅ Battle removed: ${battleId}`);
          });

          console.log(`🧹 Cleanup complete for ${leavingAddress}: removed ${battlesToRemove.length} battles`);
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
            status: 'active',
            currentTurn: payload.player1,
            moves: [],
            startTime: Date.now(),
            player1Hp: 100,
            player2Hp: 100,
            maxHp: 100,
            battleLog: [`Battle started! ${payload.player1.slice(0,6)}...${payload.player1.slice(-4)} vs ${payload.player2.slice(0,6)}...${payload.player2.slice(-4)}`]
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
            // 计算伤害基于动作类型
            let damage = 0;
            let actionDescription = '';
            const isPlayer1Turn = battle.currentTurn === battle.player1;
            const attacker = isPlayer1Turn ? 'Player1' : 'Player2';
            const defender = isPlayer1Turn ? 'Player2' : 'Player1';

            switch (payload.action) {
              case 'attack':
                damage = Math.floor(Math.random() * 11) + 15; // 15-25 damage
                actionDescription = `${attacker} attacks for ${damage} damage!`;
                break;
              case 'defend':
                damage = Math.floor(Math.random() * 6) + 5; // 5-10 damage (reduced)
                actionDescription = `${attacker} defends but still takes ${damage} damage!`;
                break;
              case 'special':
                damage = Math.floor(Math.random() * 16) + 20; // 20-35 damage
                actionDescription = `${attacker} uses special attack for ${damage} damage!`;
                break;
            }

            // 应用伤害
            if (isPlayer1Turn) {
              battle.player2Hp = Math.max(0, battle.player2Hp - damage);
            } else {
              battle.player1Hp = Math.max(0, battle.player1Hp - damage);
            }

            // 添加到战斗日志
            if (!battle.battleLog) battle.battleLog = [];
            battle.battleLog.push(actionDescription);

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
              const winnerName = battle.winner === battle.player1 ? 'Player1' : 'Player2';
              battle.battleLog.push(`🏆 ${winnerName} wins the battle!`);

              // 重置玩家状态
              const p1 = gameState.players.get(battle.player1);
              const p2 = gameState.players.get(battle.player2);
              if (p1) gameState.players.set(battle.player1, { ...p1, status: 'idle' });
              if (p2) gameState.players.set(battle.player2, { ...p2, status: 'idle' });
            } else {
              // 切换回合
              battle.currentTurn = battle.currentTurn === battle.player1 ? battle.player2 : battle.player1;
              const nextPlayer = battle.currentTurn === battle.player1 ? 'Player1' : 'Player2';
              battle.battleLog.push(`It's ${nextPlayer}'s turn!`);
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
