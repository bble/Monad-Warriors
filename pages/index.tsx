import { useState, useEffect } from 'react';
import Head from 'next/head';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance } from 'wagmi';
import { formatMWAR } from '@/utils/web3Config';
import HeroCollection from '@/components/HeroCollection';
import GameArena from '@/components/GameArena';
import PlayerStats from '@/components/PlayerStats';
import GameLobby from '@/components/GameLobby';
import Leaderboard from '@/components/Leaderboard';
import Equipment from '@/components/Equipment';
import Marketplace from '@/components/Marketplace';
import Guild from '@/components/Guild';
import Quests from '@/components/Quests';

export default function Home() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('heroes');
  
  const { data: ethBalance } = useBalance({
    address: address,
  });

  const tabs = [
    { id: 'heroes', name: 'Heroes', icon: '⚔️' },
    { id: 'equipment', name: 'Equipment', icon: '🛡️' },
    { id: 'quests', name: 'Quests', icon: '📋' },
    { id: 'lobby', name: 'Lobby', icon: '🌐' },
    { id: 'arena', name: 'Arena', icon: '🏟️' },
    { id: 'marketplace', name: 'Market', icon: '🏪' },
    { id: 'guild', name: 'Guild', icon: '🏰' },
    { id: 'leaderboard', name: 'Leaderboard', icon: '🏆' },
    { id: 'stats', name: 'Stats', icon: '📊' },
  ];

  return (
    <>
      <Head>
        <title>Monad Warriors - GameFi on Monad</title>
        <meta name="description" content="Play-to-Earn GameFi on Monad Blockchain" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-pattern">
        {/* Header */}
        <header className="glass-panel m-4 p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold neon-text">
                ⚔️ Monad Warriors
              </h1>
              <div className="text-sm text-gray-300">
                <div>Network: Monad Testnet</div>
                {isConnected && ethBalance && (
                  <div>Balance: {parseFloat(ethBalance.formatted).toFixed(4)} MON</div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {isConnected && (
                <div className="text-right text-sm">
                  <div className="text-gray-300">Connected</div>
                  <div className="text-green-400 font-mono">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </div>
                </div>
              )}
              <ConnectButton />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 pb-8">
          {!isConnected ? (
            /* Welcome Screen */
            <div className="text-center py-20">
              <div className="glass-panel p-12 max-w-4xl mx-auto">
                <h2 className="text-6xl font-bold mb-8 neon-text">
                  Welcome to Monad Warriors
                </h2>
                <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                  Enter the ultimate GameFi experience on Monad blockchain. 
                  Collect powerful heroes, battle other players, and earn MWAR tokens 
                  in this high-performance, low-cost gaming ecosystem.
                </p>
                
                <div className="grid md:grid-cols-3 gap-8 mb-12">
                  <div className="card-hover p-6">
                    <div className="text-4xl mb-4">⚔️</div>
                    <h3 className="text-xl font-semibold mb-2">Collect Heroes</h3>
                    <p className="text-gray-400">
                      Mint unique NFT heroes with different rarities and classes. 
                      Each hero has unique attributes and abilities.
                    </p>
                  </div>
                  
                  <div className="card-hover p-6">
                    <div className="text-4xl mb-4">🏟️</div>
                    <h3 className="text-xl font-semibold mb-2">Battle & Earn</h3>
                    <p className="text-gray-400">
                      Engage in strategic PvP battles. Win battles to earn MWAR tokens 
                      and climb the leaderboards.
                    </p>
                  </div>
                  
                  <div className="card-hover p-6">
                    <div className="text-4xl mb-4">🚀</div>
                    <h3 className="text-xl font-semibold mb-2">High Performance</h3>
                    <p className="text-gray-400">
                      Built on Monad for lightning-fast transactions and minimal fees. 
                      Experience seamless gameplay.
                    </p>
                  </div>
                </div>
                
                <div className="text-lg text-blue-300">
                  Connect your wallet to start playing!
                </div>
              </div>
            </div>
          ) : (
            /* Game Interface */
            <>
              {/* Navigation Tabs */}
              <div className="glass-panel p-2 mb-6">
                <div className="flex space-x-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'text-gray-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="text-xl">{tab.icon}</span>
                      <span>{tab.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="min-h-[600px]">
                {activeTab === 'heroes' && <HeroCollection />}
                {activeTab === 'equipment' && <Equipment />}
                {activeTab === 'quests' && <Quests />}
                {activeTab === 'lobby' && <GameLobby />}
                {activeTab === 'arena' && <GameArena />}
                {activeTab === 'marketplace' && <Marketplace />}
                {activeTab === 'guild' && <Guild />}
                {activeTab === 'leaderboard' && <Leaderboard />}
                {activeTab === 'stats' && <PlayerStats />}
              </div>
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="glass-panel m-4 p-4 text-center text-gray-400">
          <div className="flex justify-center items-center space-x-8 mb-2">
            <div>Built on Monad Blockchain</div>
            <div>•</div>
            <div>Powered by MultiSYNQ</div>
            <div>•</div>
            <div>GameFi Revolution</div>
          </div>
          <div className="text-sm text-green-400 font-semibold">
            🎉 Experience the Future of GameFi on Monad! 🏆
          </div>
        </footer>
      </div>
    </>
  );
}
