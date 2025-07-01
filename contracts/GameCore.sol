// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./MWARToken.sol";
import "./HeroNFT.sol";

/**
 * @title GameCore
 * @dev Monad Warriors游戏核心逻辑合约
 * 功能: 战斗系统、奖励分发、排行榜管理
 */
contract GameCore is Ownable, Pausable, ReentrancyGuard {
    MWARToken public mwarToken;
    HeroNFT public heroNFT;
    
    // 战斗结果枚举
    enum BattleResult { Win, Lose, Draw }
    
    // 战斗记录结构
    struct BattleRecord {
        address player1;
        address player2;
        uint256 hero1Id;
        uint256 hero2Id;
        BattleResult result;
        uint256 timestamp;
        uint256 rewardAmount;
    }
    
    // 玩家统计结构
    struct PlayerStats {
        uint256 totalBattles;
        uint256 wins;
        uint256 losses;
        uint256 draws;
        uint256 totalRewards;
        uint256 lastBattleTime;
        uint256 winStreak;
        uint256 maxWinStreak;
    }
    
    // 每日奖励限制
    uint256 public constant DAILY_REWARD_LIMIT = 1000 * 10**18; // 1000 MWAR
    uint256 public constant BATTLE_COOLDOWN = 300; // 5分钟冷却时间
    
    // 基础奖励配置
    uint256 public baseWinReward = 10 * 10**18; // 10 MWAR
    uint256 public baseLoseReward = 2 * 10**18; // 2 MWAR
    uint256 public drawReward = 5 * 10**18; // 5 MWAR
    
    // 存储映射
    mapping(address => PlayerStats) public playerStats;
    mapping(address => uint256) public dailyRewards;
    mapping(address => uint256) public lastRewardDate;
    mapping(uint256 => bool) public heroInBattle;
    
    // 战斗记录数组
    BattleRecord[] public battleHistory;
    
    // 排行榜 (按胜率排序的前100名)
    address[] public leaderboard;
    uint256 public constant LEADERBOARD_SIZE = 100;
    
    // 事件
    event BattleCompleted(
        address indexed player1,
        address indexed player2,
        uint256 hero1Id,
        uint256 hero2Id,
        BattleResult result,
        uint256 rewardAmount
    );
    event RewardDistributed(address indexed player, uint256 amount, string reason);
    event LeaderboardUpdated(address indexed player, uint256 newRank);
    
    constructor(address _mwarToken, address _heroNFT) Ownable(msg.sender) {
        require(_mwarToken != address(0), "Invalid MWAR token address");
        require(_heroNFT != address(0), "Invalid Hero NFT address");
        
        mwarToken = MWARToken(_mwarToken);
        heroNFT = HeroNFT(_heroNFT);
    }
    
    /**
     * @dev 开始PvP战斗
     */
    function startPvPBattle(
        uint256 myHeroId,
        address opponent,
        uint256 opponentHeroId
    ) external whenNotPaused nonReentrant {
        require(heroNFT.ownerOf(myHeroId) == msg.sender, "Not owner of hero");
        require(heroNFT.ownerOf(opponentHeroId) == opponent, "Invalid opponent hero");
        require(!heroInBattle[myHeroId], "Hero is already in battle");
        require(!heroInBattle[opponentHeroId], "Opponent hero is in battle");
        require(
            block.timestamp >= playerStats[msg.sender].lastBattleTime + BATTLE_COOLDOWN,
            "Battle cooldown not finished"
        );
        
        // 检查每日奖励限制
        _updateDailyRewardDate(msg.sender);
        require(
            dailyRewards[msg.sender] < DAILY_REWARD_LIMIT,
            "Daily reward limit reached"
        );
        
        // 标记英雄为战斗中
        heroInBattle[myHeroId] = true;
        heroInBattle[opponentHeroId] = true;
        
        // 计算战斗结果
        BattleResult result = _calculateBattleResult(myHeroId, opponentHeroId);
        
        // 分发奖励
        uint256 rewardAmount = _distributeRewards(msg.sender, opponent, result);
        
        // 更新统计数据
        _updatePlayerStats(msg.sender, result, rewardAmount);
        _updatePlayerStats(opponent, _getOpponentResult(result), 0);
        
        // 记录战斗历史
        battleHistory.push(BattleRecord({
            player1: msg.sender,
            player2: opponent,
            hero1Id: myHeroId,
            hero2Id: opponentHeroId,
            result: result,
            timestamp: block.timestamp,
            rewardAmount: rewardAmount
        }));
        
        // 更新排行榜
        _updateLeaderboard(msg.sender);
        _updateLeaderboard(opponent);
        
        // 解除英雄战斗状态
        heroInBattle[myHeroId] = false;
        heroInBattle[opponentHeroId] = false;
        
        emit BattleCompleted(
            msg.sender,
            opponent,
            myHeroId,
            opponentHeroId,
            result,
            rewardAmount
        );
    }
    
    /**
     * @dev 计算战斗结果
     */
    function _calculateBattleResult(
        uint256 hero1Id,
        uint256 hero2Id
    ) internal view returns (BattleResult) {
        uint256 power1 = heroNFT.getHeroPower(hero1Id);
        uint256 power2 = heroNFT.getHeroPower(hero2Id);
        
        // 添加随机因素 (基于区块哈希)
        uint256 randomFactor = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            hero1Id,
            hero2Id
        ))) % 100;
        
        // 计算胜率 (战力差距越大，胜率越高)
        uint256 powerDiff = power1 > power2 ? power1 - power2 : power2 - power1;
        uint256 winChance = 50; // 基础50%胜率
        
        if (power1 > power2) {
            winChance += (powerDiff * 30) / power2; // 最多增加30%胜率
            winChance = winChance > 80 ? 80 : winChance; // 最高80%胜率
        } else if (power2 > power1) {
            winChance -= (powerDiff * 30) / power1; // 最多减少30%胜率
            winChance = winChance < 20 ? 20 : winChance; // 最低20%胜率
        }
        
        if (randomFactor < winChance) {
            return BattleResult.Win;
        } else if (randomFactor < winChance + 10) { // 10%平局概率
            return BattleResult.Draw;
        } else {
            return BattleResult.Lose;
        }
    }
    
    /**
     * @dev 分发战斗奖励
     */
    function _distributeRewards(
        address player,
        address opponent,
        BattleResult result
    ) internal returns (uint256) {
        uint256 rewardAmount = 0;
        
        if (result == BattleResult.Win) {
            rewardAmount = baseWinReward;
            // 连胜奖励
            uint256 winStreak = playerStats[player].winStreak;
            if (winStreak >= 3) {
                rewardAmount += (winStreak - 2) * (baseWinReward / 10); // 每连胜增加10%
            }
        } else if (result == BattleResult.Lose) {
            rewardAmount = baseLoseReward;
        } else {
            rewardAmount = drawReward;
        }
        
        // 检查每日限制
        if (dailyRewards[player] + rewardAmount > DAILY_REWARD_LIMIT) {
            rewardAmount = DAILY_REWARD_LIMIT - dailyRewards[player];
        }
        
        if (rewardAmount > 0) {
            mwarToken.mintReward(player, rewardAmount);
            dailyRewards[player] += rewardAmount;
            emit RewardDistributed(player, rewardAmount, "Battle Reward");
        }
        
        return rewardAmount;
    }
    
    /**
     * @dev 更新玩家统计数据
     */
    function _updatePlayerStats(
        address player,
        BattleResult result,
        uint256 rewardAmount
    ) internal {
        PlayerStats storage stats = playerStats[player];
        stats.totalBattles++;
        stats.totalRewards += rewardAmount;
        stats.lastBattleTime = block.timestamp;
        
        if (result == BattleResult.Win) {
            stats.wins++;
            stats.winStreak++;
            if (stats.winStreak > stats.maxWinStreak) {
                stats.maxWinStreak = stats.winStreak;
            }
        } else if (result == BattleResult.Lose) {
            stats.losses++;
            stats.winStreak = 0;
        } else {
            stats.draws++;
            stats.winStreak = 0;
        }
    }
    
    /**
     * @dev 获取对手的战斗结果
     */
    function _getOpponentResult(BattleResult result) internal pure returns (BattleResult) {
        if (result == BattleResult.Win) {
            return BattleResult.Lose;
        } else if (result == BattleResult.Lose) {
            return BattleResult.Win;
        } else {
            return BattleResult.Draw;
        }
    }
    
    /**
     * @dev 更新每日奖励日期
     */
    function _updateDailyRewardDate(address player) internal {
        uint256 today = block.timestamp / 86400; // 当前日期
        if (lastRewardDate[player] != today) {
            lastRewardDate[player] = today;
            dailyRewards[player] = 0;
        }
    }
    
    /**
     * @dev 更新排行榜
     */
    function _updateLeaderboard(address player) internal {
        PlayerStats memory stats = playerStats[player];
        if (stats.totalBattles < 1) return; // 至少1场战斗才能上榜

        uint256 winRate = (stats.wins * 100) / stats.totalBattles;

        // 检查是否已在排行榜中
        bool inLeaderboard = false;
        uint256 playerIndex = 0;

        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i] == player) {
                inLeaderboard = true;
                playerIndex = i;
                break;
            }
        }

        if (!inLeaderboard && leaderboard.length < LEADERBOARD_SIZE) {
            // 添加到排行榜末尾
            leaderboard.push(player);
            playerIndex = leaderboard.length - 1;
        } else if (!inLeaderboard) {
            // 排行榜已满，检查是否能替换最后一名
            address lastPlayer = leaderboard[LEADERBOARD_SIZE - 1];
            PlayerStats memory lastStats = playerStats[lastPlayer];
            uint256 lastWinRate = lastStats.totalBattles > 0 ?
                (lastStats.wins * 100) / lastStats.totalBattles : 0;

            if (winRate > lastWinRate) {
                leaderboard[LEADERBOARD_SIZE - 1] = player;
                playerIndex = LEADERBOARD_SIZE - 1;
            } else {
                return; // 不够资格进入排行榜
            }
        }

        // 向上冒泡排序
        for (uint256 i = playerIndex; i > 0; i--) {
            address currentPlayer = leaderboard[i];
            address prevPlayer = leaderboard[i - 1];

            PlayerStats memory currentStats = playerStats[currentPlayer];
            PlayerStats memory prevStats = playerStats[prevPlayer];

            uint256 currentWinRate = (currentStats.wins * 100) / currentStats.totalBattles;
            uint256 prevWinRate = prevStats.totalBattles > 0 ?
                (prevStats.wins * 100) / prevStats.totalBattles : 0;

            if (currentWinRate > prevWinRate) {
                leaderboard[i] = prevPlayer;
                leaderboard[i - 1] = currentPlayer;
            } else {
                break;
            }
        }

        emit LeaderboardUpdated(player, playerIndex);
    }
    
    /**
     * @dev 获取玩家胜率
     */
    function getPlayerWinRate(address player) external view returns (uint256) {
        PlayerStats memory stats = playerStats[player];
        if (stats.totalBattles == 0) return 0;
        return (stats.wins * 100) / stats.totalBattles;
    }
    
    /**
     * @dev 获取战斗历史数量
     */
    function getBattleHistoryLength() external view returns (uint256) {
        return battleHistory.length;
    }
    
    /**
     * @dev 设置奖励金额
     */
    function setRewardAmounts(
        uint256 _baseWinReward,
        uint256 _baseLoseReward,
        uint256 _drawReward
    ) external onlyOwner {
        baseWinReward = _baseWinReward;
        baseLoseReward = _baseLoseReward;
        drawReward = _drawReward;
    }
    
    /**
     * @dev 暂停合约
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev 恢复合约
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev 获取排行榜
     */
    function getLeaderboard() external view returns (address[] memory) {
        return leaderboard;
    }

    /**
     * @dev 获取排行榜前N名
     */
    function getTopPlayers(uint256 count) external view returns (address[] memory) {
        uint256 length = count > leaderboard.length ? leaderboard.length : count;
        address[] memory topPlayers = new address[](length);

        for (uint256 i = 0; i < length; i++) {
            topPlayers[i] = leaderboard[i];
        }

        return topPlayers;
    }

    /**
     * @dev 获取玩家排名
     */
    function getPlayerRank(address player) external view returns (uint256) {
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i] == player) {
                return i + 1; // 排名从1开始
            }
        }
        return 0; // 未上榜
    }

    /**
     * @dev 批量获取玩家统计
     */
    function getPlayersStats(address[] calldata players)
        external view returns (PlayerStats[] memory) {
        PlayerStats[] memory stats = new PlayerStats[](players.length);

        for (uint256 i = 0; i < players.length; i++) {
            stats[i] = playerStats[players[i]];
        }

        return stats;
    }

    /**
     * @dev 获取最近的战斗记录
     */
    function getRecentBattles(uint256 count) external view returns (BattleRecord[] memory) {
        uint256 length = count > battleHistory.length ? battleHistory.length : count;
        BattleRecord[] memory recentBattles = new BattleRecord[](length);

        for (uint256 i = 0; i < length; i++) {
            recentBattles[i] = battleHistory[battleHistory.length - 1 - i];
        }

        return recentBattles;
    }

    /**
     * @dev 获取全局统计数据
     */
    function getGlobalStats() external view returns (
        uint256 totalPlayers,
        uint256 totalBattles,
        uint256 totalRewardsDistributed,
        uint256 totalHeroes
    ) {
        // 计算总玩家数（有战斗记录的玩家）
        totalPlayers = 0;
        totalRewardsDistributed = 0;

        // 遍历排行榜来计算活跃玩家数和总奖励
        for (uint256 i = 0; i < leaderboard.length; i++) {
            address player = leaderboard[i];
            PlayerStats memory stats = playerStats[player];
            if (stats.totalBattles > 0) {
                totalPlayers++;
                totalRewardsDistributed += stats.totalRewards;
            }
        }

        // 总战斗数
        totalBattles = battleHistory.length;

        // 总英雄数（从HeroNFT合约获取）
        totalHeroes = heroNFT.totalSupply();

        return (totalPlayers, totalBattles, totalRewardsDistributed, totalHeroes);
    }

    /**
     * @dev 获取玩家的战斗记录
     */
    function getPlayerBattles(address player, uint256 count)
        external view returns (BattleRecord[] memory) {
        // 先计算玩家参与的战斗数量
        uint256 playerBattleCount = 0;
        for (uint256 i = 0; i < battleHistory.length; i++) {
            if (battleHistory[i].player1 == player || battleHistory[i].player2 == player) {
                playerBattleCount++;
            }
        }

        uint256 length = count > playerBattleCount ? playerBattleCount : count;
        BattleRecord[] memory playerBattles = new BattleRecord[](length);

        uint256 found = 0;
        // 从最新的战斗开始查找
        for (uint256 i = battleHistory.length; i > 0 && found < length; i--) {
            if (battleHistory[i-1].player1 == player || battleHistory[i-1].player2 == player) {
                playerBattles[found] = battleHistory[i-1];
                found++;
            }
        }

        return playerBattles;
    }
}
