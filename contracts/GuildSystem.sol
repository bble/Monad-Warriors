// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./MWARToken.sol";

/**
 * @title GuildSystem
 * @dev 公会系统合约 - 完全链上存储
 */
contract GuildSystem is Ownable, Pausable, ReentrancyGuard {
    MWARToken public mwarToken;
    
    uint256 private _guildIdCounter = 1;
    uint256 public constant GUILD_CREATION_COST = 1000 * 10**18; // 1000 MWAR
    uint256 public constant MAX_GUILD_MEMBERS = 50;
    uint256 public constant GUILD_WAR_DURATION = 7 days;
    
    // 公会结构
    struct Guild {
        uint256 id;
        string name;
        string description;
        address leader;
        uint256 level;
        uint256 experience;
        uint256 treasury;
        uint256 memberCount;
        uint256 createdAt;
        bool isActive;
    }
    
    // 公会成员结构
    struct GuildMember {
        address member;
        uint256 guildId;
        uint256 joinedAt;
        uint256 contribution;
        bool isOfficer;
    }
    
    // 公会战争结构
    struct GuildWar {
        uint256 id;
        uint256 attackerGuildId;
        uint256 defenderGuildId;
        uint256 startTime;
        uint256 endTime;
        uint256 attackerScore;
        uint256 defenderScore;
        uint256 prize;
        bool isActive;
        bool isFinished;
    }
    
    // 存储映射
    mapping(uint256 => Guild) public guilds;
    mapping(address => uint256) public playerGuild; // 玩家所属公会ID
    mapping(uint256 => address[]) public guildMembers; // 公会成员列表
    mapping(address => GuildMember) public memberInfo;
    mapping(uint256 => GuildWar) public guildWars;
    mapping(string => bool) public guildNameTaken;
    
    uint256[] public activeGuilds;
    uint256[] public activeWars;
    uint256 private _warIdCounter = 1;
    
    // 事件
    event GuildCreated(uint256 indexed guildId, string name, address indexed leader);
    event GuildJoined(uint256 indexed guildId, address indexed member);
    event GuildLeft(uint256 indexed guildId, address indexed member);
    event GuildLevelUp(uint256 indexed guildId, uint256 newLevel);
    event GuildWarStarted(uint256 indexed warId, uint256 attackerGuild, uint256 defenderGuild);
    event GuildWarEnded(uint256 indexed warId, uint256 winnerGuild, uint256 prize);
    event ContributionAdded(uint256 indexed guildId, address indexed member, uint256 amount);
    
    constructor(address _mwarToken) Ownable(msg.sender) {
        require(_mwarToken != address(0), "Invalid MWAR token address");
        mwarToken = MWARToken(_mwarToken);
    }
    
    /**
     * @dev 创建公会
     */
    function createGuild(string memory name, string memory description) external whenNotPaused {
        require(bytes(name).length > 0 && bytes(name).length <= 32, "Invalid guild name");
        require(!guildNameTaken[name], "Guild name already taken");
        require(playerGuild[msg.sender] == 0, "Already in a guild");
        require(mwarToken.balanceOf(msg.sender) >= GUILD_CREATION_COST, "Insufficient MWAR balance");
        
        // 转账创建费用
        mwarToken.transferFrom(msg.sender, address(this), GUILD_CREATION_COST);
        
        uint256 guildId = _guildIdCounter;
        _guildIdCounter++;
        
        // 创建公会
        guilds[guildId] = Guild({
            id: guildId,
            name: name,
            description: description,
            leader: msg.sender,
            level: 1,
            experience: 0,
            treasury: 0,
            memberCount: 1,
            createdAt: block.timestamp,
            isActive: true
        });
        
        // 设置创建者为公会成员
        playerGuild[msg.sender] = guildId;
        guildMembers[guildId].push(msg.sender);
        memberInfo[msg.sender] = GuildMember({
            member: msg.sender,
            guildId: guildId,
            joinedAt: block.timestamp,
            contribution: 0,
            isOfficer: true
        });
        
        guildNameTaken[name] = true;
        activeGuilds.push(guildId);
        
        emit GuildCreated(guildId, name, msg.sender);
        emit GuildJoined(guildId, msg.sender);
    }
    
    /**
     * @dev 加入公会
     */
    function joinGuild(uint256 guildId) external whenNotPaused {
        require(guilds[guildId].isActive, "Guild not active");
        require(playerGuild[msg.sender] == 0, "Already in a guild");
        require(guilds[guildId].memberCount < MAX_GUILD_MEMBERS, "Guild is full");
        
        // 加入公会
        playerGuild[msg.sender] = guildId;
        guildMembers[guildId].push(msg.sender);
        memberInfo[msg.sender] = GuildMember({
            member: msg.sender,
            guildId: guildId,
            joinedAt: block.timestamp,
            contribution: 0,
            isOfficer: false
        });
        
        guilds[guildId].memberCount++;
        
        emit GuildJoined(guildId, msg.sender);
    }
    
    /**
     * @dev 离开公会
     */
    function leaveGuild() external {
        uint256 guildId = playerGuild[msg.sender];
        require(guildId != 0, "Not in a guild");
        require(guilds[guildId].leader != msg.sender, "Leader cannot leave guild");
        
        _removeMemberFromGuild(msg.sender, guildId);
        
        emit GuildLeft(guildId, msg.sender);
    }
    
    /**
     * @dev 踢出成员 (仅公会长和官员)
     */
    function kickMember(address member) external {
        uint256 guildId = playerGuild[msg.sender];
        require(guildId != 0, "Not in a guild");
        require(playerGuild[member] == guildId, "Member not in same guild");
        require(guilds[guildId].leader == msg.sender || memberInfo[msg.sender].isOfficer, "Not authorized");
        require(guilds[guildId].leader != member, "Cannot kick guild leader");
        
        _removeMemberFromGuild(member, guildId);
        
        emit GuildLeft(guildId, member);
    }
    
    /**
     * @dev 内部函数：从公会移除成员
     */
    function _removeMemberFromGuild(address member, uint256 guildId) internal {
        // 从成员列表中移除
        address[] storage members = guildMembers[guildId];
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i] == member) {
                members[i] = members[members.length - 1];
                members.pop();
                break;
            }
        }
        
        // 清除成员信息
        delete memberInfo[member];
        delete playerGuild[member];
        guilds[guildId].memberCount--;
    }
    
    /**
     * @dev 向公会金库贡献MWAR
     */
    function contributeToGuild(uint256 amount) external nonReentrant {
        uint256 guildId = playerGuild[msg.sender];
        require(guildId != 0, "Not in a guild");
        require(amount > 0, "Amount must be greater than 0");
        require(mwarToken.balanceOf(msg.sender) >= amount, "Insufficient MWAR balance");
        
        mwarToken.transferFrom(msg.sender, address(this), amount);
        
        guilds[guildId].treasury += amount;
        memberInfo[msg.sender].contribution += amount;
        
        // 增加公会经验
        uint256 expGain = amount / (10**18); // 1 MWAR = 1 EXP
        guilds[guildId].experience += expGain;
        
        // 检查是否升级
        _checkGuildLevelUp(guildId);
        
        emit ContributionAdded(guildId, msg.sender, amount);
    }
    
    /**
     * @dev 检查公会升级
     */
    function _checkGuildLevelUp(uint256 guildId) internal {
        Guild storage guild = guilds[guildId];
        uint256 requiredExp = guild.level * 1000; // 每级需要 level * 1000 经验
        
        if (guild.experience >= requiredExp && guild.level < 50) {
            guild.level++;
            guild.experience -= requiredExp;
            
            emit GuildLevelUp(guildId, guild.level);
        }
    }
    
    /**
     * @dev 发起公会战争
     */
    function declareWar(uint256 targetGuildId, uint256 prize) external {
        uint256 attackerGuildId = playerGuild[msg.sender];
        require(attackerGuildId != 0, "Not in a guild");
        require(guilds[attackerGuildId].leader == msg.sender, "Only guild leader can declare war");
        require(guilds[targetGuildId].isActive, "Target guild not active");
        require(attackerGuildId != targetGuildId, "Cannot declare war on own guild");
        require(guilds[attackerGuildId].treasury >= prize, "Insufficient guild treasury");
        
        uint256 warId = _warIdCounter;
        _warIdCounter++;
        
        // 创建公会战争
        guildWars[warId] = GuildWar({
            id: warId,
            attackerGuildId: attackerGuildId,
            defenderGuildId: targetGuildId,
            startTime: block.timestamp,
            endTime: block.timestamp + GUILD_WAR_DURATION,
            attackerScore: 0,
            defenderScore: 0,
            prize: prize,
            isActive: true,
            isFinished: false
        });
        
        // 锁定奖金
        guilds[attackerGuildId].treasury -= prize;
        
        activeWars.push(warId);
        
        emit GuildWarStarted(warId, attackerGuildId, targetGuildId);
    }
    
    /**
     * @dev 结束公会战争
     */
    function endGuildWar(uint256 warId) external {
        GuildWar storage war = guildWars[warId];
        require(war.isActive, "War not active");
        require(block.timestamp >= war.endTime, "War not finished yet");
        
        war.isActive = false;
        war.isFinished = true;
        
        // 确定获胜者
        uint256 winnerGuildId;
        if (war.attackerScore > war.defenderScore) {
            winnerGuildId = war.attackerGuildId;
        } else if (war.defenderScore > war.attackerScore) {
            winnerGuildId = war.defenderGuildId;
        } else {
            // 平局，奖金退回攻击方
            winnerGuildId = war.attackerGuildId;
        }
        
        // 分发奖金
        guilds[winnerGuildId].treasury += war.prize;
        
        // 从活跃战争列表中移除
        for (uint256 i = 0; i < activeWars.length; i++) {
            if (activeWars[i] == warId) {
                activeWars[i] = activeWars[activeWars.length - 1];
                activeWars.pop();
                break;
            }
        }
        
        emit GuildWarEnded(warId, winnerGuildId, war.prize);
    }
    
    /**
     * @dev 获取公会信息
     */
    function getGuildInfo(uint256 guildId) external view returns (Guild memory) {
        return guilds[guildId];
    }
    
    /**
     * @dev 获取公会成员列表
     */
    function getGuildMembers(uint256 guildId) external view returns (address[] memory) {
        return guildMembers[guildId];
    }
    
    /**
     * @dev 获取活跃公会列表
     */
    function getActiveGuilds() external view returns (uint256[] memory) {
        return activeGuilds;
    }
    
    /**
     * @dev 获取活跃战争列表
     */
    function getActiveWars() external view returns (uint256[] memory) {
        return activeWars;
    }
    
    /**
     * @dev 获取玩家公会ID
     */
    function getPlayerGuildId(address player) external view returns (uint256) {
        return playerGuild[player];
    }
    
    /**
     * @dev 获取成员信息
     */
    function getMemberInfo(address member) external view returns (GuildMember memory) {
        return memberInfo[member];
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
