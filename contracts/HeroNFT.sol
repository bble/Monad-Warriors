// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./MWARToken.sol";

/**
 * @title HeroNFT
 * @dev Monad Warriors英雄NFT合约
 * 功能: 英雄铸造、属性管理、升级系统
 */
contract HeroNFT is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable, Pausable {
    uint256 private _tokenIdCounter;
    MWARToken public mwarToken;
    
    // 英雄稀有度枚举
    enum Rarity { Common, Rare, Epic, Legendary }
    
    // 英雄职业枚举
    enum Class { Warrior, Mage, Archer, Assassin, Priest }
    
    // 英雄属性结构
    struct HeroAttributes {
        uint256 strength;     // 力量
        uint256 intelligence; // 智力
        uint256 agility;      // 敏捷
        uint256 vitality;     // 体质
        uint256 luck;         // 幸运
        uint256 level;        // 等级
        uint256 experience;   // 经验值
        Rarity rarity;        // 稀有度
        Class class;          // 职业
        uint256 birthTime;    // 出生时间
    }
    
    // 铸造成本配置
    mapping(Rarity => uint256) public mintCosts;
    
    // 英雄属性映射
    mapping(uint256 => HeroAttributes) public heroes;
    
    // 升级成本配置
    uint256 public constant LEVEL_UP_BASE_COST = 100 * 10**18; // 100 MWAR
    uint256 public constant MAX_LEVEL = 100;
    
    // 事件
    event HeroMinted(
        address indexed owner,
        uint256 indexed tokenId,
        Rarity rarity,
        Class class
    );
    event HeroLevelUp(uint256 indexed tokenId, uint256 newLevel);
    event HeroAttributesUpdated(uint256 indexed tokenId);
    
    constructor(address _mwarToken) ERC721("Monad Warriors Hero", "MWH") Ownable(msg.sender) {
        require(_mwarToken != address(0), "Invalid MWAR token address");
        mwarToken = MWARToken(_mwarToken);
        
        // 设置铸造成本
        mintCosts[Rarity.Common] = 100 * 10**18;      // 100 MWAR
        mintCosts[Rarity.Rare] = 300 * 10**18;        // 300 MWAR
        mintCosts[Rarity.Epic] = 800 * 10**18;        // 800 MWAR
        mintCosts[Rarity.Legendary] = 2000 * 10**18;  // 2000 MWAR
    }
    
    /**
     * @dev 铸造英雄NFT
     */
    function mintHero(
        address to,
        Rarity rarity,
        Class class,
        string memory uri
    ) external whenNotPaused {
        require(to != address(0), "Cannot mint to zero address");
        require(uint256(rarity) <= uint256(Rarity.Legendary), "Invalid rarity");
        require(uint256(class) <= uint256(Class.Priest), "Invalid class");
        
        uint256 cost = mintCosts[rarity];
        require(mwarToken.balanceOf(msg.sender) >= cost, "Insufficient MWAR balance");
        
        // 转账MWAR代币作为铸造费用
        mwarToken.transferFrom(msg.sender, address(this), cost);
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        // 生成英雄属性
        HeroAttributes memory attributes = _generateHeroAttributes(rarity, class);
        heroes[tokenId] = attributes;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        emit HeroMinted(to, tokenId, rarity, class);
    }
    
    /**
     * @dev 生成英雄属性
     */
    function _generateHeroAttributes(
        Rarity rarity,
        Class class
    ) internal view returns (HeroAttributes memory) {
        // 基础属性值
        uint256 baseStats = 50;
        
        // 根据稀有度调整属性
        uint256 rarityMultiplier = 100 + uint256(rarity) * 25; // 100%, 125%, 150%, 175%
        
        // 根据职业调整属性分配
        (uint256 str, uint256 intel, uint256 agi, uint256 vit, uint256 luck) = 
            _getClassBaseStats(class);
        
        return HeroAttributes({
            strength: (baseStats * str * rarityMultiplier) / 10000,
            intelligence: (baseStats * intel * rarityMultiplier) / 10000,
            agility: (baseStats * agi * rarityMultiplier) / 10000,
            vitality: (baseStats * vit * rarityMultiplier) / 10000,
            luck: (baseStats * luck * rarityMultiplier) / 10000,
            level: 1,
            experience: 0,
            rarity: rarity,
            class: class,
            birthTime: block.timestamp
        });
    }
    
    /**
     * @dev 获取职业基础属性分配
     */
    function _getClassBaseStats(Class class) internal pure returns (
        uint256 str, uint256 intel, uint256 agi, uint256 vit, uint256 luck
    ) {
        if (class == Class.Warrior) {
            return (130, 80, 90, 120, 80);  // 战士: 高力量和体质
        } else if (class == Class.Mage) {
            return (70, 140, 90, 80, 120);  // 法师: 高智力和幸运
        } else if (class == Class.Archer) {
            return (100, 90, 140, 90, 80);  // 射手: 高敏捷
        } else if (class == Class.Assassin) {
            return (110, 80, 130, 70, 110); // 刺客: 高敏捷和幸运
        } else { // Priest
            return (80, 120, 80, 110, 110); // 牧师: 高智力和体质
        }
    }
    
    /**
     * @dev 英雄升级
     */
    function levelUpHero(uint256 tokenId) external {
        require(_ownerOf(tokenId) != address(0), "Hero does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not the owner of this hero");
        
        HeroAttributes storage hero = heroes[tokenId];
        require(hero.level < MAX_LEVEL, "Hero already at max level");
        
        uint256 cost = LEVEL_UP_BASE_COST * hero.level;
        require(mwarToken.balanceOf(msg.sender) >= cost, "Insufficient MWAR balance");
        
        // 转账MWAR代币作为升级费用
        mwarToken.transferFrom(msg.sender, address(this), cost);
        
        // 升级英雄
        hero.level++;
        
        // 提升属性 (每级提升2%)
        uint256 boost = 102; // 1.02倍
        hero.strength = (hero.strength * boost) / 100;
        hero.intelligence = (hero.intelligence * boost) / 100;
        hero.agility = (hero.agility * boost) / 100;
        hero.vitality = (hero.vitality * boost) / 100;
        hero.luck = (hero.luck * boost) / 100;
        
        emit HeroLevelUp(tokenId, hero.level);
        emit HeroAttributesUpdated(tokenId);
    }
    
    /**
     * @dev 获取英雄属性
     */
    function getHeroAttributes(uint256 tokenId) external view returns (HeroAttributes memory) {
        require(_ownerOf(tokenId) != address(0), "Hero does not exist");
        return heroes[tokenId];
    }
    
    /**
     * @dev 获取英雄战斗力
     */
    function getHeroPower(uint256 tokenId) external view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "Hero does not exist");
        HeroAttributes memory hero = heroes[tokenId];
        
        // 计算综合战斗力
        return hero.strength + hero.intelligence + hero.agility + hero.vitality + hero.luck;
    }
    
    /**
     * @dev 设置铸造成本
     */
    function setMintCost(Rarity rarity, uint256 cost) external onlyOwner {
        mintCosts[rarity] = cost;
    }
    
    /**
     * @dev 提取合约中的MWAR代币
     */
    function withdrawMWAR(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        mwarToken.transfer(to, amount);
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
    
    // 重写必要的函数
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        whenNotPaused
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
