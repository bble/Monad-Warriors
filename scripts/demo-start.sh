#!/bin/bash

# Monad Warriors - 演示启动脚本
# 一键启动完整的演示环境

echo "🎮 Monad Warriors - Demo Environment Setup"
echo "=========================================="
echo ""

# 检查Node.js版本
echo "📋 Checking Node.js version..."
node_version=$(node -v)
echo "   Node.js version: $node_version"

if [[ "$node_version" < "v18" ]]; then
    echo "❌ Node.js version 18+ required"
    exit 1
fi

echo "✅ Node.js version check passed"
echo ""

# 检查依赖
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi
echo ""

# 检查环境变量
echo "🔧 Checking environment variables..."
if [ ! -f ".env" ]; then
    echo "   Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your configuration"
else
    echo "✅ Environment file exists"
fi
echo ""

# 运行优化脚本
echo "⚡ Running optimization..."
node scripts/optimize.js
echo ""

# 运行部署检查
echo "🔍 Running deployment readiness check..."
node scripts/deploy-check.js
echo ""

# 启动开发服务器
echo "🚀 Starting development server..."
echo "   Application will be available at:"
echo "   📱 Local:    http://localhost:3001"
echo "   🌐 Network:  http://$(ipconfig getifaddr en0):3001"
echo ""
echo "🎯 Demo Features Available:"
echo "   ⚔️  Hero Collection & Minting"
echo "   🛡️  Equipment System"
echo "   📋 Quest & Mission System"
echo "   🌐 Multiplayer Lobby (MultiSYNQ)"
echo "   🏟️  Battle Arena (PvP/PvE)"
echo "   🏪 NFT Marketplace"
echo "   🏰 Guild System"
echo "   🏆 Leaderboards"
echo "   📊 Player Statistics"
echo ""
echo "💡 Demo Tips:"
echo "   1. Connect your MetaMask wallet"
echo "   2. Switch to Monad Testnet"
echo "   3. Explore all 9 game modules"
echo "   4. Try the real-time multiplayer features"
echo "   5. Experience the complete GameFi ecosystem"
echo ""
echo "🎬 Starting demo environment..."
echo "   Press Ctrl+C to stop the demo"
echo ""

# 启动应用
npm run dev
