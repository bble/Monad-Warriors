// 游戏数据管理系统 - 统一管理所有游戏相关数据

export interface GameData {
  heroes: Hero[];
  equipment: Equipment[];
  battles: Battle[];
  guilds: Guild[];
  marketplace: MarketListing[];
  achievements: Achievement[];
  quests: Quest[];
}

export interface Hero {
  tokenId: number;
  owner: string;
  name: string;
  rarity: number;
  class: number;
  level: number;
  experience: number;
  maxExperience: number;
  attributes: {
    strength: number;
    intelligence: number;
    agility: number;
    vitality: number;
    luck: number;
  };
  equipment: {
    weapon?: number;
    armor?: number;
    accessory?: number;
  };
  skills: Skill[];
  createdAt: string;
  lastBattle: string;
}

export interface Equipment {
  id: number;
  name: string;
  type: 'weapon' | 'armor' | 'accessory';
  rarity: number;
  level: number;
  stats: {
    strength?: number;
    intelligence?: number;
    agility?: number;
    vitality?: number;
    luck?: number;
  };
  requirements: {
    level: number;
    class?: number[];
  };
  price: number;
  description: string;
  image: string;
  owner?: string;
}

export interface Battle {
  id: string;
  type: 'pvp' | 'pve' | 'guild' | 'tournament';
  player1: string;
  player2: string;
  hero1Id: number;
  hero2Id: number;
  winner: string;
  rounds: BattleRound[];
  rewards: {
    winner: number;
    loser: number;
    experience: number;
  };
  timestamp: string;
  duration: number;
}

export interface BattleRound {
  round: number;
  player1Action: string;
  player2Action: string;
  player1Damage: number;
  player2Damage: number;
  player1Hp: number;
  player2Hp: number;
}

export interface Guild {
  id: string;
  name: string;
  description: string;
  level: number;
  experience: number;
  maxExperience: number;
  members: GuildMember[];
  treasury: number;
  requirements: {
    minLevel: number;
    applicationRequired: boolean;
  };
  perks: {
    expBonus: number;
    rewardBonus: number;
    battleBonus: number;
  };
  createdAt: string;
  leader: string;
}

export interface GuildMember {
  address: string;
  name: string;
  role: 'leader' | 'officer' | 'member';
  joinedAt: string;
  contribution: number;
  lastActive: string;
}

export interface MarketListing {
  id: string;
  seller: string;
  itemType: 'hero' | 'equipment';
  itemId: number;
  price: number;
  currency: 'MWAR' | 'MON';
  listedAt: string;
  expiresAt: string;
  status: 'active' | 'sold' | 'cancelled' | 'expired';
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'battle' | 'collection' | 'social' | 'progression';
  requirements: any;
  rewards: {
    mwar?: number;
    experience?: number;
    title?: string;
  };
  icon: string;
  rarity: number;
  unlockedBy?: string[];
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'story' | 'event';
  objectives: QuestObjective[];
  rewards: {
    mwar: number;
    experience: number;
    items?: number[];
  };
  requirements: {
    level?: number;
    completedQuests?: string[];
  };
  status: 'available' | 'active' | 'completed' | 'expired';
  expiresAt?: string;
}

export interface QuestObjective {
  id: string;
  description: string;
  type: 'battle' | 'collect' | 'level' | 'social';
  target: number;
  current: number;
  completed: boolean;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  type: 'active' | 'passive';
  level: number;
  maxLevel: number;
  cooldown?: number;
  manaCost?: number;
  effects: SkillEffect[];
}

export interface SkillEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff';
  value: number;
  duration?: number;
  target: 'self' | 'enemy' | 'all';
}

// 游戏数据管理类
export class GameDataManager {
  private static instance: GameDataManager;
  private gameData: GameData;

  private constructor() {
    this.gameData = this.initializeGameData();
  }

  public static getInstance(): GameDataManager {
    if (!GameDataManager.instance) {
      GameDataManager.instance = new GameDataManager();
    }
    return GameDataManager.instance;
  }

  private initializeGameData(): GameData {
    return {
      heroes: [],
      equipment: this.getDefaultEquipment(),
      battles: [],
      guilds: this.getDefaultGuilds(),
      marketplace: [],
      achievements: this.getDefaultAchievements(),
      quests: this.getDefaultQuests()
    };
  }

  // 获取默认装备数据
  private getDefaultEquipment(): Equipment[] {
    return [
      {
        id: 1,
        name: 'Iron Sword',
        type: 'weapon',
        rarity: 0,
        level: 1,
        stats: { strength: 15, agility: 5 },
        requirements: { level: 1, class: [0, 3] },
        price: 100,
        description: 'A basic iron sword for beginners.',
        image: '⚔️'
      },
      {
        id: 2,
        name: 'Mystic Staff',
        type: 'weapon',
        rarity: 1,
        level: 3,
        stats: { intelligence: 25, luck: 8 },
        requirements: { level: 3, class: [1, 4] },
        price: 300,
        description: 'A staff imbued with magical energy.',
        image: '🔮'
      },
      {
        id: 3,
        name: 'Elven Bow',
        type: 'weapon',
        rarity: 2,
        level: 5,
        stats: { agility: 30, strength: 10 },
        requirements: { level: 5, class: [2] },
        price: 800,
        description: 'A masterfully crafted elven bow.',
        image: '🏹'
      },
      {
        id: 4,
        name: 'Leather Armor',
        type: 'armor',
        rarity: 0,
        level: 1,
        stats: { vitality: 20, agility: 5 },
        requirements: { level: 1 },
        price: 150,
        description: 'Basic leather protection.',
        image: '🛡️'
      },
      {
        id: 5,
        name: 'Dragon Scale Mail',
        type: 'armor',
        rarity: 3,
        level: 10,
        stats: { vitality: 50, strength: 15, intelligence: 10 },
        requirements: { level: 10 },
        price: 2000,
        description: 'Armor forged from ancient dragon scales.',
        image: '🐉'
      }
    ];
  }

  // 获取默认公会数据
  private getDefaultGuilds(): Guild[] {
    return [
      {
        id: '1',
        name: 'Dragon Slayers',
        description: 'Elite warriors dedicated to slaying dragons.',
        level: 8,
        experience: 15420,
        maxExperience: 20000,
        members: [],
        treasury: 45670,
        requirements: { minLevel: 5, applicationRequired: true },
        perks: { expBonus: 15, rewardBonus: 10, battleBonus: 5 },
        createdAt: '2024-01-15',
        leader: '0x1234567890123456789012345678901234567890'
      }
    ];
  }

  // 获取默认成就数据
  private getDefaultAchievements(): Achievement[] {
    return [
      {
        id: 'first_hero',
        name: 'First Steps',
        description: 'Mint your first hero',
        category: 'collection',
        requirements: { heroCount: 1 },
        rewards: { mwar: 100, experience: 50 },
        icon: '⚔️',
        rarity: 0
      },
      {
        id: 'first_victory',
        name: 'Victorious',
        description: 'Win your first battle',
        category: 'battle',
        requirements: { wins: 1 },
        rewards: { mwar: 200, experience: 100 },
        icon: '🏆',
        rarity: 0
      },
      {
        id: 'legendary_collector',
        name: 'Legendary Collector',
        description: 'Own 5 legendary heroes',
        category: 'collection',
        requirements: { legendaryHeroes: 5 },
        rewards: { mwar: 5000, experience: 1000, title: 'Legendary Collector' },
        icon: '👑',
        rarity: 3
      }
    ];
  }

  // 获取默认任务数据
  private getDefaultQuests(): Quest[] {
    return [
      {
        id: 'daily_battle',
        name: 'Daily Training',
        description: 'Complete 3 battles today',
        type: 'daily',
        objectives: [
          {
            id: 'battle_3',
            description: 'Win 3 battles',
            type: 'battle',
            target: 3,
            current: 0,
            completed: false
          }
        ],
        rewards: { mwar: 100, experience: 50 },
        requirements: { level: 1 },
        status: 'available'
      },
      {
        id: 'weekly_collection',
        name: 'Hero Collector',
        description: 'Mint 5 new heroes this week',
        type: 'weekly',
        objectives: [
          {
            id: 'mint_5',
            description: 'Mint 5 heroes',
            type: 'collect',
            target: 5,
            current: 0,
            completed: false
          }
        ],
        rewards: { mwar: 500, experience: 200 },
        requirements: { level: 3 },
        status: 'available'
      }
    ];
  }

  // 数据访问方法
  public getHeroes(): Hero[] {
    return this.gameData.heroes;
  }

  public getEquipment(): Equipment[] {
    return this.gameData.equipment;
  }

  public getBattles(): Battle[] {
    return this.gameData.battles;
  }

  public getGuilds(): Guild[] {
    return this.gameData.guilds;
  }

  public getMarketplace(): MarketListing[] {
    return this.gameData.marketplace;
  }

  public getAchievements(): Achievement[] {
    return this.gameData.achievements;
  }

  public getQuests(): Quest[] {
    return this.gameData.quests;
  }

  // 数据更新方法
  public addHero(hero: Hero): void {
    this.gameData.heroes.push(hero);
  }

  public updateHero(tokenId: number, updates: Partial<Hero>): void {
    const index = this.gameData.heroes.findIndex(h => h.tokenId === tokenId);
    if (index !== -1) {
      this.gameData.heroes[index] = { ...this.gameData.heroes[index], ...updates };
    }
  }

  public addBattle(battle: Battle): void {
    this.gameData.battles.push(battle);
  }

  public addMarketListing(listing: MarketListing): void {
    this.gameData.marketplace.push(listing);
  }

  public updateMarketListing(id: string, updates: Partial<MarketListing>): void {
    const index = this.gameData.marketplace.findIndex(l => l.id === id);
    if (index !== -1) {
      this.gameData.marketplace[index] = { ...this.gameData.marketplace[index], ...updates };
    }
  }

  // 数据持久化（本地存储）
  public saveToLocalStorage(): void {
    localStorage.setItem('monadWarriorsGameData', JSON.stringify(this.gameData));
  }

  public loadFromLocalStorage(): void {
    const saved = localStorage.getItem('monadWarriorsGameData');
    if (saved) {
      try {
        this.gameData = { ...this.gameData, ...JSON.parse(saved) };
      } catch (error) {
        console.error('Failed to load game data from localStorage:', error);
      }
    }
  }

  // 数据重置
  public resetGameData(): void {
    this.gameData = this.initializeGameData();
    localStorage.removeItem('monadWarriorsGameData');
  }
}

// 导出单例实例
export const gameDataManager = GameDataManager.getInstance();
