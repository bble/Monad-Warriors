// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./MWARToken.sol";
import "./HeroNFT.sol";

/**
 * @title QuestSystem
 * @dev 任务系统合约 - 完全链上存储
 */
contract QuestSystem is Ownable, Pausable, ReentrancyGuard {
    MWARToken public mwarToken;
    HeroNFT public heroNFT;
    
    uint256 private _questIdCounter = 1;
    
    // 任务类型枚举
    enum QuestType { Daily, Weekly, Achievement, Special }
    
    // 任务状态枚举
    enum QuestStatus { Active, Completed, Claimed, Expired }
    
    // 任务结构
    struct Quest {
        uint256 id;
        string title;
        string description;
        QuestType questType;
        uint256 targetValue;
        uint256 mwarReward;
        uint256 expReward;
        uint256 duration; // 任务持续时间（秒）
        bool isActive;
        uint256 createdAt;
    }
    
    // 玩家任务进度
    struct PlayerQuestProgress {
        uint256 questId;
        uint256 currentProgress;
        uint256 startedAt;
        QuestStatus status;
    }
    
    // 存储映射
    mapping(uint256 => Quest) public quests;
    mapping(address => mapping(uint256 => PlayerQuestProgress)) public playerQuests;
    mapping(address => uint256[]) public playerActiveQuests;
    mapping(address => uint256) public playerDailyQuestsCompleted;
    mapping(address => uint256) public playerWeeklyQuestsCompleted;
    mapping(address => uint256) public lastDailyReset;
    mapping(address => uint256) public lastWeeklyReset;
    
    uint256[] public activeQuests;
    
    // 事件
    event QuestCreated(uint256 indexed questId, string title, QuestType questType);
    event QuestStarted(address indexed player, uint256 indexed questId);
    event QuestProgressUpdated(address indexed player, uint256 indexed questId, uint256 progress);
    event QuestCompleted(address indexed player, uint256 indexed questId);
    event QuestRewardClaimed(address indexed player, uint256 indexed questId, uint256 mwarReward);
    
    constructor(address _mwarToken, address _heroNFT) Ownable(msg.sender) {
        require(_mwarToken != address(0), "Invalid MWAR token address");
        require(_heroNFT != address(0), "Invalid Hero NFT address");
        mwarToken = MWARToken(_mwarToken);
        heroNFT = HeroNFT(_heroNFT);
        
        // 创建初始任务
        _createInitialQuests();
    }
    
    /**
     * @dev 创建初始任务
     */
    function _createInitialQuests() internal {
        // 每日任务
        _createQuest("Daily Login", "Login to the game", QuestType.Daily, 1, 10 * 10**18, 50, 1 days);
        _createQuest("Win 3 Battles", "Win 3 battles today", QuestType.Daily, 3, 50 * 10**18, 100, 1 days);
        _createQuest("Mint a Hero", "Mint any hero", QuestType.Daily, 1, 100 * 10**18, 200, 1 days);
        
        // 每周任务
        _createQuest("Win 20 Battles", "Win 20 battles this week", QuestType.Weekly, 20, 300 * 10**18, 500, 7 days);
        _createQuest("Mint 5 Heroes", "Mint 5 heroes this week", QuestType.Weekly, 5, 500 * 10**18, 1000, 7 days);
        
        // 成就任务
        _createQuest("First Victory", "Win your first battle", QuestType.Achievement, 1, 200 * 10**18, 300, 0);
        _createQuest("Hero Collector", "Own 10 heroes", QuestType.Achievement, 10, 1000 * 10**18, 2000, 0);
        _createQuest("Battle Master", "Win 100 battles", QuestType.Achievement, 100, 5000 * 10**18, 10000, 0);
        _createQuest("Legendary Owner", "Own a legendary hero", QuestType.Achievement, 1, 2000 * 10**18, 5000, 0);
    }
    
    /**
     * @dev 创建任务
     */
    function _createQuest(
        string memory title,
        string memory description,
        QuestType questType,
        uint256 targetValue,
        uint256 mwarReward,
        uint256 expReward,
        uint256 duration
    ) internal {
        uint256 questId = _questIdCounter;
        _questIdCounter++;
        
        quests[questId] = Quest({
            id: questId,
            title: title,
            description: description,
            questType: questType,
            targetValue: targetValue,
            mwarReward: mwarReward,
            expReward: expReward,
            duration: duration,
            isActive: true,
            createdAt: block.timestamp
        });
        
        activeQuests.push(questId);
        
        emit QuestCreated(questId, title, questType);
    }
    
    /**
     * @dev 开始任务
     */
    function startQuest(uint256 questId) external whenNotPaused {
        require(quests[questId].isActive, "Quest not active");
        require(playerQuests[msg.sender][questId].status == QuestStatus(0) || 
                playerQuests[msg.sender][questId].status == QuestStatus.Expired, "Quest already started");
        
        Quest memory quest = quests[questId];
        
        // 检查每日/每周任务限制
        if (quest.questType == QuestType.Daily) {
            _resetDailyQuests(msg.sender);
            require(playerDailyQuestsCompleted[msg.sender] < 5, "Daily quest limit reached");
        } else if (quest.questType == QuestType.Weekly) {
            _resetWeeklyQuests(msg.sender);
            require(playerWeeklyQuestsCompleted[msg.sender] < 3, "Weekly quest limit reached");
        }
        
        playerQuests[msg.sender][questId] = PlayerQuestProgress({
            questId: questId,
            currentProgress: 0,
            startedAt: block.timestamp,
            status: QuestStatus.Active
        });
        
        playerActiveQuests[msg.sender].push(questId);
        
        emit QuestStarted(msg.sender, questId);
    }
    
    /**
     * @dev 更新任务进度
     */
    function updateQuestProgress(address player, uint256 questId, uint256 progressIncrement) external {
        require(msg.sender == address(mwarToken) || msg.sender == address(heroNFT) || msg.sender == owner(), 
                "Not authorized to update progress");
        
        PlayerQuestProgress storage progress = playerQuests[player][questId];
        require(progress.status == QuestStatus.Active, "Quest not active");
        
        Quest memory quest = quests[questId];
        
        // 检查任务是否过期
        if (quest.duration > 0 && block.timestamp > progress.startedAt + quest.duration) {
            progress.status = QuestStatus.Expired;
            return;
        }
        
        progress.currentProgress += progressIncrement;
        
        // 检查是否完成
        if (progress.currentProgress >= quest.targetValue) {
            progress.currentProgress = quest.targetValue;
            progress.status = QuestStatus.Completed;
            
            // 更新完成计数
            if (quest.questType == QuestType.Daily) {
                playerDailyQuestsCompleted[player]++;
            } else if (quest.questType == QuestType.Weekly) {
                playerWeeklyQuestsCompleted[player]++;
            }
            
            emit QuestCompleted(player, questId);
        }
        
        emit QuestProgressUpdated(player, questId, progress.currentProgress);
    }
    
    /**
     * @dev 领取任务奖励
     */
    function claimQuestReward(uint256 questId) external nonReentrant {
        PlayerQuestProgress storage progress = playerQuests[msg.sender][questId];
        require(progress.status == QuestStatus.Completed, "Quest not completed");
        
        Quest memory quest = quests[questId];
        progress.status = QuestStatus.Claimed;
        
        // 发放MWAR奖励
        if (quest.mwarReward > 0) {
            mwarToken.transfer(msg.sender, quest.mwarReward);
        }
        
        // 从活跃任务列表中移除
        _removeFromActiveQuests(msg.sender, questId);
        
        emit QuestRewardClaimed(msg.sender, questId, quest.mwarReward);
    }
    
    /**
     * @dev 重置每日任务
     */
    function _resetDailyQuests(address player) internal {
        if (block.timestamp >= lastDailyReset[player] + 1 days) {
            playerDailyQuestsCompleted[player] = 0;
            lastDailyReset[player] = block.timestamp;
        }
    }
    
    /**
     * @dev 重置每周任务
     */
    function _resetWeeklyQuests(address player) internal {
        if (block.timestamp >= lastWeeklyReset[player] + 7 days) {
            playerWeeklyQuestsCompleted[player] = 0;
            lastWeeklyReset[player] = block.timestamp;
        }
    }
    
    /**
     * @dev 从活跃任务列表中移除
     */
    function _removeFromActiveQuests(address player, uint256 questId) internal {
        uint256[] storage activeQuestsList = playerActiveQuests[player];
        for (uint256 i = 0; i < activeQuestsList.length; i++) {
            if (activeQuestsList[i] == questId) {
                activeQuestsList[i] = activeQuestsList[activeQuestsList.length - 1];
                activeQuestsList.pop();
                break;
            }
        }
    }
    
    /**
     * @dev 获取任务信息
     */
    function getQuestInfo(uint256 questId) external view returns (Quest memory) {
        return quests[questId];
    }
    
    /**
     * @dev 获取玩家任务进度
     */
    function getPlayerQuestProgress(address player, uint256 questId) 
        external view returns (PlayerQuestProgress memory) {
        return playerQuests[player][questId];
    }
    
    /**
     * @dev 获取玩家活跃任务
     */
    function getPlayerActiveQuests(address player) external view returns (uint256[] memory) {
        return playerActiveQuests[player];
    }
    
    /**
     * @dev 获取所有活跃任务
     */
    function getActiveQuests() external view returns (uint256[] memory) {
        return activeQuests;
    }
    
    /**
     * @dev 获取特定类型的任务
     */
    function getQuestsByType(QuestType questType) external view returns (uint256[] memory) {
        uint256[] memory typeQuests = new uint256[](activeQuests.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < activeQuests.length; i++) {
            if (quests[activeQuests[i]].questType == questType) {
                typeQuests[count] = activeQuests[i];
                count++;
            }
        }
        
        // 调整数组大小
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = typeQuests[i];
        }
        
        return result;
    }
    
    /**
     * @dev 管理员创建新任务
     */
    function createQuest(
        string memory title,
        string memory description,
        QuestType questType,
        uint256 targetValue,
        uint256 mwarReward,
        uint256 expReward,
        uint256 duration
    ) external onlyOwner {
        _createQuest(title, description, questType, targetValue, mwarReward, expReward, duration);
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
     * @dev 提取合约中的MWAR代币
     */
    function withdrawMWAR(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        mwarToken.transfer(to, amount);
    }
}
