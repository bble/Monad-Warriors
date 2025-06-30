const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🔄 Updating frontend configuration for full on-chain deployment...");
  
  // 读取部署信息
  const deploymentPath = path.join(__dirname, '..', 'full-deployment-info.json');
  if (!fs.existsSync(deploymentPath)) {
    console.log("❌ Full deployment info not found. Please deploy contracts first.");
    process.exit(1);
  }
  
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const contracts = deploymentInfo.contracts;
  
  console.log("📋 Updating configuration for contracts:");
  Object.entries(contracts).forEach(([name, address]) => {
    console.log(`   ${name}: ${address}`);
  });

  // 1. 更新合约ABI文件
  console.log("\n📝 Updating contract ABI configuration...");
  
  const abiConfigPath = path.join(__dirname, '..', 'utils', 'contractABI.ts');
  
  const abiConfig = `// Auto-generated contract configuration
// Generated on: ${new Date().toISOString()}
// Network: Monad Testnet
// Deployment: Full On-Chain

// Contract addresses
export const CONTRACT_ADDRESSES = {
  MWAR_TOKEN: '${contracts.MWAR_TOKEN}',
  HERO_NFT: '${contracts.HERO_NFT}',
  EQUIPMENT_NFT: '${contracts.EQUIPMENT_NFT}',
  GAME_CORE: '${contracts.GAME_CORE}',
  GUILD_SYSTEM: '${contracts.GUILD_SYSTEM}',
  QUEST_SYSTEM: '${contracts.QUEST_SYSTEM}',
  MARKETPLACE: '${contracts.MARKETPLACE}',
} as const;

// MWAR Token ABI (simplified for frontend use)
export const MWAR_TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function canClaimFromFaucet(address user) view returns (bool)",
  "function claimFromFaucet()",
  "function getTimeUntilNextFaucetClaim(address user) view returns (uint256)",
  "function FAUCET_AMOUNT() view returns (uint256)",
  "function isGameContract(address) view returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
] as const;

// Hero NFT ABI (simplified for frontend use)
export const HERO_NFT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function getHeroAttributes(uint256 tokenId) view returns (tuple(uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint8,uint8,uint256))",
  "function getHerosByOwner(address owner) view returns (uint256[])",
  "function getHeroesAttributes(uint256[] tokenIds) view returns (tuple(uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint8,uint8,uint256)[])",
  "function mintHero(address to, uint8 rarity, uint8 class, string uri)",
  "function upgradeHero(uint256 tokenId)",
  "function mintCosts(uint8 rarity) view returns (uint256)",
  "function getHeroPower(uint256 tokenId) view returns (uint256)",
  "function approve(address to, uint256 tokenId)",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event HeroMinted(address indexed owner, uint256 indexed tokenId, uint8 rarity, uint8 class)"
] as const;

// Equipment NFT ABI (simplified for frontend use)
export const EQUIPMENT_NFT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function getPlayerEquipment(address player) view returns (uint256[])",
  "function getEquipmentAttributes(uint256 tokenId) view returns (tuple(string,uint8,uint8,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool,uint256))",
  "function getEquipmentsAttributes(uint256[] tokenIds) view returns (tuple(string,uint8,uint8,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool,uint256)[])",
  "function craftEquipment(uint8 equipmentType, uint8 rarity, string name)",
  "function upgradeEquipment(uint256 tokenId)",
  "function equipToHero(uint256 tokenId, uint256 heroId)",
  "function unequipFromHero(uint256 tokenId)",
  "function getHeroEquipment(uint256 heroId) view returns (uint256[])",
  "function craftingRecipes(uint8 equipmentType, uint8 rarity) view returns (tuple(uint256,uint256,bool))",
  "event EquipmentCrafted(address indexed owner, uint256 indexed tokenId, uint8 equipmentType, uint8 rarity)",
  "event EquipmentEquipped(uint256 indexed tokenId, uint256 indexed heroId)"
] as const;

// Game Core ABI (simplified for frontend use)
export const GAME_CORE_ABI = [
  "function playerStats(address player) view returns (tuple(uint256,uint256,uint256,uint256,uint256,uint256))",
  "function getPlayerWinRate(address player) view returns (uint256)",
  "function createBattle(uint256 heroId, address opponent, uint256 opponentHeroId)",
  "function getLeaderboard() view returns (address[])",
  "function getTopPlayers(uint256 count) view returns (address[])",
  "function getPlayerRank(address player) view returns (uint256)",
  "function getPlayersStats(address[] players) view returns (tuple(uint256,uint256,uint256,uint256,uint256,uint256)[])",
  "function getRecentBattles(uint256 count) view returns (tuple(uint256,address,address,uint256,uint256,address,uint256,uint256)[])",
  "function getPlayerBattles(address player, uint256 count) view returns (tuple(uint256,address,address,uint256,uint256,address,uint256,uint256)[])",
  "function baseWinReward() view returns (uint256)",
  "function baseLoseReward() view returns (uint256)",
  "function drawReward() view returns (uint256)",
  "function DAILY_REWARD_LIMIT() view returns (uint256)",
  "function BATTLE_COOLDOWN() view returns (uint256)",
  "function LEADERBOARD_SIZE() view returns (uint256)",
  "event BattleCreated(uint256 indexed battleId, address indexed player1, address indexed player2)",
  "event BattleCompleted(uint256 indexed battleId, address indexed winner, uint256 reward)"
] as const;

// Guild System ABI (simplified for frontend use)
export const GUILD_SYSTEM_ABI = [
  "function getPlayerGuildId(address player) view returns (uint256)",
  "function getGuildInfo(uint256 guildId) view returns (tuple(uint256,string,string,address,uint256,uint256,uint256,uint256,uint256,bool))",
  "function getGuildMembers(uint256 guildId) view returns (address[])",
  "function getMemberInfo(address member) view returns (tuple(address,uint256,uint256,uint256,bool))",
  "function getActiveGuilds() view returns (uint256[])",
  "function getActiveWars() view returns (uint256[])",
  "function createGuild(string name, string description)",
  "function joinGuild(uint256 guildId)",
  "function leaveGuild()",
  "function contributeToGuild(uint256 amount)",
  "function declareWar(uint256 targetGuildId, uint256 prize)",
  "function GUILD_CREATION_COST() view returns (uint256)",
  "function MAX_GUILD_MEMBERS() view returns (uint256)",
  "event GuildCreated(uint256 indexed guildId, string name, address indexed leader)",
  "event GuildJoined(uint256 indexed guildId, address indexed member)"
] as const;

// Quest System ABI (simplified for frontend use)
export const QUEST_SYSTEM_ABI = [
  "function getQuestInfo(uint256 questId) view returns (tuple(uint256,string,string,uint8,uint256,uint256,uint256,uint256,bool,uint256))",
  "function getPlayerQuestProgress(address player, uint256 questId) view returns (tuple(uint256,uint256,uint256,uint8))",
  "function getPlayerActiveQuests(address player) view returns (uint256[])",
  "function getActiveQuests() view returns (uint256[])",
  "function getQuestsByType(uint8 questType) view returns (uint256[])",
  "function startQuest(uint256 questId)",
  "function claimQuestReward(uint256 questId)",
  "function updateQuestProgress(address player, uint256 questId, uint256 progressIncrement)",
  "event QuestStarted(address indexed player, uint256 indexed questId)",
  "event QuestCompleted(address indexed player, uint256 indexed questId)",
  "event QuestRewardClaimed(address indexed player, uint256 indexed questId, uint256 mwarReward)"
] as const;

// Marketplace ABI (simplified for frontend use)
export const MARKETPLACE_ABI = [
  "function getListing(uint256 listingId) view returns (tuple(uint256,address,uint8,address,uint256,uint8,uint256,uint256,address,uint256,uint8,uint256))",
  "function getActiveListings() view returns (uint256[])",
  "function getUserListings(address user) view returns (uint256[])",
  "function getListingBids(uint256 listingId) view returns (tuple(address,uint256,uint256)[])",
  "function listItem(uint8 nftType, uint256 tokenId, uint256 price)",
  "function createAuction(uint8 nftType, uint256 tokenId, uint256 startingPrice, uint256 duration)",
  "function buyItem(uint256 listingId)",
  "function placeBid(uint256 listingId, uint256 bidAmount)",
  "function endAuction(uint256 listingId)",
  "function cancelListing(uint256 listingId)",
  "function withdraw()",
  "function pendingWithdrawals(address) view returns (uint256)",
  "function marketplaceFee() view returns (uint256)",
  "event ItemListed(uint256 indexed listingId, address indexed seller, uint8 nftType, uint256 indexed tokenId, uint256 price)",
  "event ItemSold(uint256 indexed listingId, address indexed seller, address indexed buyer, uint256 price)"
] as const;

// Network configuration
export const NETWORK_CONFIG = {
  chainId: 10143,
  name: 'Monad Testnet',
  rpcUrl: 'https://testnet-rpc.monad.xyz',
  blockExplorer: 'https://testnet.monadexplorer.com',
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18,
  },
} as const;

// Game constants
export const GAME_CONSTANTS = {
  RARITY_NAMES: ['Common', 'Rare', 'Epic', 'Legendary'],
  RARITY_COLORS: ['gray', 'blue', 'purple', 'orange'],
  CLASS_NAMES: ['Warrior', 'Mage', 'Archer', 'Assassin', 'Paladin'],
  EQUIPMENT_TYPES: ['Weapon', 'Armor', 'Accessory'],
  QUEST_TYPES: ['Daily', 'Weekly', 'Achievement', 'Special'],
  MINT_COSTS: {
    0: 100,  // Common
    1: 300,  // Rare
    2: 800,  // Epic
    3: 2000, // Legendary
  },
} as const;
`;

  fs.writeFileSync(abiConfigPath, abiConfig);
  console.log("✅ Contract ABI configuration updated");

  // 2. 创建新的组件配置
  console.log("\n🎨 Creating component configuration...");
  
  const componentConfigPath = path.join(__dirname, '..', 'utils', 'gameConfig.ts');
  
  const componentConfig = `// Game configuration for full on-chain deployment
// Generated on: ${new Date().toISOString()}

export const GAME_CONFIG = {
  // Feature flags
  FEATURES: {
    HERO_MINTING: true,
    EQUIPMENT_CRAFTING: true,
    PVP_BATTLES: true,
    GUILD_SYSTEM: true,
    QUEST_SYSTEM: true,
    MARKETPLACE: true,
    FAUCET: true,
  },
  
  // UI Configuration
  UI: {
    ITEMS_PER_PAGE: 12,
    MAX_HEROES_DISPLAY: 50,
    REFRESH_INTERVAL: 30000, // 30 seconds
    BATTLE_ANIMATION_DURATION: 3000,
  },
  
  // Contract interaction settings
  CONTRACTS: {
    DEFAULT_GAS_LIMIT: 500000,
    DEFAULT_GAS_PRICE: '20', // gwei
    APPROVAL_AMOUNT: '115792089237316195423570985008687907853269984665640564039457584007913129639935', // max uint256
  },
  
  // Game mechanics
  MECHANICS: {
    BATTLE_COOLDOWN: 300, // 5 minutes
    DAILY_QUEST_LIMIT: 5,
    WEEKLY_QUEST_LIMIT: 3,
    MAX_GUILD_MEMBERS: 50,
    AUCTION_MIN_DURATION: 3600, // 1 hour
    AUCTION_MAX_DURATION: 604800, // 7 days
  },
} as const;

// Helper functions
export const formatMWAR = (amount: bigint): string => {
  return (Number(amount) / 1e18).toFixed(2);
};

export const parseMWAR = (amount: string): bigint => {
  return BigInt(Math.floor(parseFloat(amount) * 1e18));
};

export const getRarityColor = (rarity: number): string => {
  const colors = ['text-gray-400', 'text-blue-400', 'text-purple-400', 'text-orange-400'];
  return colors[rarity] || 'text-gray-400';
};

export const getClassIcon = (classType: number): string => {
  const icons = ['⚔️', '🔮', '🏹', '🗡️', '🛡️'];
  return icons[classType] || '⚔️';
};

export const getEquipmentTypeIcon = (equipmentType: number): string => {
  const icons = ['⚔️', '🛡️', '💍'];
  return icons[equipmentType] || '⚔️';
};

export const formatTimeLeft = (seconds: number): string => {
  if (seconds <= 0) return 'Expired';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return \`\${hours}h \${minutes}m\`;
  } else if (minutes > 0) {
    return \`\${minutes}m \${secs}s\`;
  } else {
    return \`\${secs}s\`;
  }
};

export const shortenAddress = (address: string): string => {
  return \`\${address.slice(0, 6)}...\${address.slice(-4)}\`;
};
`;

  fs.writeFileSync(componentConfigPath, componentConfig);
  console.log("✅ Game configuration created");

  console.log("\n🎉 Frontend configuration updated successfully!");
  console.log("\n💡 Next steps:");
  console.log("   1. Update your components to use the new contract addresses");
  console.log("   2. Import the new ABIs and configurations");
  console.log("   3. Test all features with the deployed contracts");
  console.log("   4. Update any hardcoded contract addresses in components");
  
  console.log("\n📝 Updated files:");
  console.log("   - utils/contractABI.ts (contract addresses and ABIs)");
  console.log("   - utils/gameConfig.ts (game configuration and helpers)");
  
  console.log("\n🔗 Contract Explorer Links:");
  Object.entries(contracts).forEach(([name, address]) => {
    console.log(`   ${name}: https://testnet.monadexplorer.com/address/${address}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
