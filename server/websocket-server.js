const WebSocket = require('ws');
const http = require('http');

// 创建HTTP服务器
const server = http.createServer();

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server });

// 存储所有连接的客户端
const clients = new Map();

// 游戏状态
const gameState = {
  players: new Map(),
  battles: new Map(),
  lobbies: new Map()
};

console.log('🚀 Starting WebSocket server...');

wss.on('connection', (ws, req) => {
  const clientId = generateClientId();
  clients.set(clientId, {
    ws: ws,
    id: clientId,
    address: null,
    lastPing: Date.now(),
    messageCount: 0,
    lastMessageTime: Date.now()
  });

  console.log(`✅ Client connected: ${clientId} (Total: ${clients.size})`);

  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'connected',
    data: { clientId: clientId }
  }));

  // 处理消息
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(clientId, data);
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  });

  // 处理断开连接
  ws.on('close', () => {
    const client = clients.get(clientId);
    if (client && client.address) {
      // 广播玩家离开
      broadcast({
        type: 'player-left',
        data: { address: client.address }
      }, clientId);
      
      // 从游戏状态中移除玩家
      gameState.players.delete(client.address);
    }
    
    clients.delete(clientId);
    console.log(`❌ Client disconnected: ${clientId} (Total: ${clients.size})`);
  });

  // 处理错误
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for client ${clientId}:`, error);
  });
});

// 处理消息
function handleMessage(clientId, message) {
  try {
    const { type, data } = message;
    const client = clients.get(clientId);

    if (!client) {
      console.warn(`⚠️ Message from unknown client: ${clientId}`);
      return;
    }

    // 限流检查 - 每秒最多10条消息
    const now = Date.now();
    if (now - client.lastMessageTime < 1000) {
      client.messageCount++;
      if (client.messageCount > 10) {
        console.warn(`⚠️ Rate limit exceeded for client ${clientId}`);
        client.ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Rate limit exceeded', timestamp: now }
        }));
        return;
      }
    } else {
      client.messageCount = 1;
      client.lastMessageTime = now;
    }

    console.log(`📨 Message from ${clientId}:`, type, data);

  switch (type) {
    case 'ping':
      client.lastPing = Date.now();
      client.ws.send(JSON.stringify({ type: 'pong', data: { timestamp: Date.now() } }));
      break;

    case 'player-joined':
      client.address = data.player.address;
      gameState.players.set(data.player.address, data.player);
      broadcast(message, clientId);
      break;

    case 'player-updated':
      if (gameState.players.has(data.address)) {
        gameState.players.set(data.address, data.player);
        broadcast(message, clientId);
      }
      break;

    case 'player-left':
      if (client.address) {
        gameState.players.delete(client.address);
        broadcast(message, clientId);
      }
      break;

    case 'battle-created':
      gameState.battles.set(data.battle.id, data.battle);
      broadcast(message, clientId);
      break;

    case 'battle-updated':
      if (gameState.battles.has(data.battleId)) {
        gameState.battles.set(data.battleId, data.battle);
        broadcast(message, clientId);
      }
      break;

    case 'get-game-state':
      // 发送当前游戏状态给请求的客户端
      client.ws.send(JSON.stringify({
        type: 'game-state',
        data: {
          players: Array.from(gameState.players.values()),
          battles: Array.from(gameState.battles.values())
        }
      }));
      break;

    default:
      console.log(`❓ Unknown message type: ${type}`);
  }
  } catch (error) {
    console.error(`❌ Error handling message from ${clientId}:`, error);

    // 发送错误响应给客户端
    const client = clients.get(clientId);
    if (client && client.ws.readyState === 1) {
      client.ws.send(JSON.stringify({
        type: 'error',
        data: {
          message: 'Server error processing your request',
          timestamp: Date.now()
        }
      }));
    }
  }
}

// 广播消息给所有客户端（除了发送者）
function broadcast(message, excludeClientId = null) {
  const messageStr = JSON.stringify(message);
  
  clients.forEach((client, clientId) => {
    if (clientId !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
  
  console.log(`📡 Broadcasted ${message.type} to ${clients.size - (excludeClientId ? 1 : 0)} clients`);
}

// 生成客户端ID
function generateClientId() {
  return Math.random().toString(36).substr(2, 9);
}

// 定期清理断开的连接
setInterval(() => {
  const now = Date.now();
  clients.forEach((client, clientId) => {
    if (now - client.lastPing > 60000) { // 60秒无响应
      console.log(`🧹 Cleaning up inactive client: ${clientId}`);
      client.ws.terminate();
      clients.delete(clientId);
    }
  });
}, 30000); // 每30秒检查一次

// 启动服务器
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 WebSocket server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoints:`);
  console.log(`   - ws://localhost:${PORT}`);
  console.log(`   - ws://127.0.0.1:${PORT}`);
  console.log(`   - ws://[YOUR_IP]:${PORT}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down WebSocket server...');
  wss.close(() => {
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
});
