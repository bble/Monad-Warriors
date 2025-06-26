// 战斗引擎 - 处理游戏战斗逻辑

export interface HeroStats {
  tokenId: number;
  rarity: number;
  class: number;
  level: number;
  strength: number;
  intelligence: number;
  agility: number;
  vitality: number;
  luck: number;
  hp?: number;
  maxHp?: number;
}

export interface BattleAction {
  type: 'attack' | 'defend' | 'special' | 'heal';
  power: number;
  accuracy: number;
  critical: boolean;
  damage: number;
  description: string;
}

export interface BattleRound {
  round: number;
  player1Action: BattleAction;
  player2Action: BattleAction;
  player1Hp: number;
  player2Hp: number;
  winner?: 'player1' | 'player2' | 'draw';
}

export interface BattleResult {
  winner: 'player1' | 'player2' | 'draw';
  rounds: BattleRound[];
  totalRounds: number;
  player1FinalHp: number;
  player2FinalHp: number;
  experience: number;
  reward: number;
  battleLog: string[];
}

export class BattleEngine {
  private static calculateBasePower(hero: HeroStats): number {
    const classBonuses = {
      0: { str: 1.2, int: 0.8, agi: 1.0, vit: 1.1, lck: 0.9 }, // Warrior
      1: { str: 0.8, int: 1.3, agi: 0.9, vit: 0.9, lck: 1.1 }, // Mage
      2: { str: 0.9, int: 0.9, agi: 1.3, vit: 0.8, lck: 1.1 }, // Archer
      3: { str: 1.1, int: 0.9, agi: 1.2, vit: 0.8, lck: 1.0 }, // Assassin
      4: { str: 0.8, int: 1.1, agi: 0.9, vit: 1.2, lck: 1.0 }, // Priest
    };

    const bonus = classBonuses[hero.class as keyof typeof classBonuses] || classBonuses[0];
    
    return Math.floor(
      hero.strength * bonus.str +
      hero.intelligence * bonus.int +
      hero.agility * bonus.agi +
      hero.vitality * bonus.vit +
      hero.luck * bonus.lck
    );
  }

  private static calculateHP(hero: HeroStats): number {
    const baseHp = 100 + (hero.level * 20) + (hero.vitality * 2);
    const rarityBonus = [1.0, 1.1, 1.25, 1.5][hero.rarity] || 1.0;
    return Math.floor(baseHp * rarityBonus);
  }

  private static generateAction(hero: HeroStats, actionType: 'attack' | 'defend' | 'special'): BattleAction {
    const basePower = this.calculateBasePower(hero);
    let power = 0;
    let accuracy = 0.85;
    let description = '';

    switch (actionType) {
      case 'attack':
        power = Math.floor(basePower * (0.8 + Math.random() * 0.4));
        accuracy = 0.85 + (hero.agility / 1000);
        description = 'performs a basic attack';
        break;
      
      case 'defend':
        power = Math.floor(basePower * 0.3);
        accuracy = 0.95;
        description = 'takes a defensive stance';
        break;
      
      case 'special':
        power = Math.floor(basePower * (1.2 + Math.random() * 0.6));
        accuracy = 0.7 + (hero.intelligence / 1000);
        description = 'uses a special ability';
        break;
    }

    const hitRoll = Math.random();
    const hit = hitRoll < accuracy;
    const criticalRoll = Math.random();
    const critical = hit && criticalRoll < (hero.luck / 1000 + 0.05);
    
    const finalPower = hit ? (critical ? power * 1.5 : power) : 0;

    return {
      type: actionType,
      power: finalPower,
      accuracy,
      critical,
      damage: Math.floor(finalPower),
      description: critical ? `critically ${description}` : description
    };
  }

  public static simulateBattle(hero1: HeroStats, hero2: HeroStats): BattleResult {
    // 初始化英雄HP
    const hero1MaxHp = this.calculateHP(hero1);
    const hero2MaxHp = this.calculateHP(hero2);
    
    let hero1Hp = hero1MaxHp;
    let hero2Hp = hero2MaxHp;
    
    const rounds: BattleRound[] = [];
    const battleLog: string[] = [];
    const maxRounds = 20;

    battleLog.push(`Battle begins! ${this.getHeroName(hero1)} vs ${this.getHeroName(hero2)}`);
    battleLog.push(`${this.getHeroName(hero1)}: ${hero1Hp}/${hero1MaxHp} HP`);
    battleLog.push(`${this.getHeroName(hero2)}: ${hero2Hp}/${hero2MaxHp} HP`);

    for (let round = 1; round <= maxRounds; round++) {
      // 随机选择行动
      const actions = ['attack', 'defend', 'special'] as const;
      const hero1ActionType = actions[Math.floor(Math.random() * actions.length)];
      const hero2ActionType = actions[Math.floor(Math.random() * actions.length)];

      const hero1Action = this.generateAction(hero1, hero1ActionType);
      const hero2Action = this.generateAction(hero2, hero2ActionType);

      // 计算伤害 (考虑防御)
      let hero1Damage = hero1Action.damage;
      let hero2Damage = hero2Action.damage;

      if (hero2Action.type === 'defend') {
        hero1Damage = Math.floor(hero1Damage * 0.5);
      }
      if (hero1Action.type === 'defend') {
        hero2Damage = Math.floor(hero2Damage * 0.5);
      }

      // 应用伤害
      hero2Hp = Math.max(0, hero2Hp - hero1Damage);
      hero1Hp = Math.max(0, hero1Hp - hero2Damage);

      // 记录回合
      const battleRound: BattleRound = {
        round,
        player1Action: hero1Action,
        player2Action: hero2Action,
        player1Hp: hero1Hp,
        player2Hp: hero2Hp
      };

      rounds.push(battleRound);

      // 战斗日志
      battleLog.push(`\n--- Round ${round} ---`);
      battleLog.push(`${this.getHeroName(hero1)} ${hero1Action.description} for ${hero1Damage} damage!`);
      battleLog.push(`${this.getHeroName(hero2)} ${hero2Action.description} for ${hero2Damage} damage!`);
      battleLog.push(`${this.getHeroName(hero1)}: ${hero1Hp}/${hero1MaxHp} HP`);
      battleLog.push(`${this.getHeroName(hero2)}: ${hero2Hp}/${hero2MaxHp} HP`);

      // 检查胜负
      if (hero1Hp <= 0 && hero2Hp <= 0) {
        battleRound.winner = 'draw';
        battleLog.push('\n🤝 Battle ends in a draw!');
        break;
      } else if (hero1Hp <= 0) {
        battleRound.winner = 'player2';
        battleLog.push(`\n🏆 ${this.getHeroName(hero2)} wins!`);
        break;
      } else if (hero2Hp <= 0) {
        battleRound.winner = 'player1';
        battleLog.push(`\n🏆 ${this.getHeroName(hero1)} wins!`);
        break;
      }
    }

    // 确定最终胜者
    let winner: 'player1' | 'player2' | 'draw' = 'draw';
    if (rounds.length > 0 && rounds[rounds.length - 1].winner) {
      winner = rounds[rounds.length - 1].winner!;
    } else if (hero1Hp > hero2Hp) {
      winner = 'player1';
    } else if (hero2Hp > hero1Hp) {
      winner = 'player2';
    }

    // 计算奖励
    const baseReward = 10;
    const levelDiff = Math.abs(hero1.level - hero2.level);
    const rewardMultiplier = winner === 'player1' ? 1.0 : 0.3;
    const reward = Math.floor(baseReward * rewardMultiplier * (1 + levelDiff * 0.1));

    const experience = Math.floor(20 + rounds.length * 2);

    return {
      winner,
      rounds,
      totalRounds: rounds.length,
      player1FinalHp: hero1Hp,
      player2FinalHp: hero2Hp,
      experience,
      reward,
      battleLog
    };
  }

  private static getHeroName(hero: HeroStats): string {
    const rarities = ['Common', 'Rare', 'Epic', 'Legendary'];
    const classes = ['Warrior', 'Mage', 'Archer', 'Assassin', 'Priest'];
    return `${rarities[hero.rarity]} ${classes[hero.class]}`;
  }

  // PVE战斗 - 对抗AI敌人
  public static simulatePvEBattle(hero: HeroStats, enemyLevel: number, enemyType: string): BattleResult {
    // 生成AI敌人
    const enemy: HeroStats = {
      tokenId: -1,
      rarity: 0,
      class: 0,
      level: enemyLevel,
      strength: 50 + enemyLevel * 5,
      intelligence: 40 + enemyLevel * 4,
      agility: 45 + enemyLevel * 4,
      vitality: 60 + enemyLevel * 6,
      luck: 30 + enemyLevel * 3
    };

    return this.simulateBattle(hero, enemy);
  }

  // 快速战斗 - 只返回结果
  public static quickBattle(hero1: HeroStats, hero2: HeroStats): { winner: 'player1' | 'player2' | 'draw', reward: number } {
    const power1 = this.calculateBasePower(hero1) * (1 + hero1.level * 0.1);
    const power2 = this.calculateBasePower(hero2) * (1 + hero2.level * 0.1);
    
    const randomFactor1 = 0.8 + Math.random() * 0.4;
    const randomFactor2 = 0.8 + Math.random() * 0.4;
    
    const finalPower1 = power1 * randomFactor1;
    const finalPower2 = power2 * randomFactor2;
    
    let winner: 'player1' | 'player2' | 'draw';
    if (Math.abs(finalPower1 - finalPower2) < 10) {
      winner = 'draw';
    } else {
      winner = finalPower1 > finalPower2 ? 'player1' : 'player2';
    }
    
    const baseReward = 10;
    const rewardMultiplier = winner === 'player1' ? 1.0 : 0.3;
    const reward = Math.floor(baseReward * rewardMultiplier);
    
    return { winner, reward };
  }
}
