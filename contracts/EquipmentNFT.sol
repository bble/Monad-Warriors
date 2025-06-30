// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./MWARToken.sol";

/**
 * @title EquipmentNFT
 * @dev 装备NFT合约 - 完全链上存储
 */
contract EquipmentNFT is ERC721, ERC721Enumerable, Ownable, Pausable {
    uint256 private _tokenIdCounter;
    MWARToken public mwarToken;
    
    // 装备类型枚举
    enum EquipmentType { Weapon, Armor, Accessory }
    
    // 装备稀有度枚举
    enum Rarity { Common, Rare, Epic, Legendary }
    
    // 装备属性结构
    struct EquipmentAttributes {
        string name;
        EquipmentType equipmentType;
        Rarity rarity;
        uint256 level;
        uint256 strengthBonus;
        uint256 intelligenceBonus;
        uint256 agilityBonus;
        uint256 vitalityBonus;
        uint256 luckBonus;
        uint256 durability;
        uint256 maxDurability;
        uint256 craftTime;
        bool isEquipped;
        uint256 equippedToHero; // 装备到哪个英雄上
    }
    
    // 装备制作配方
    struct CraftingRecipe {
        uint256 mwarCost;
        uint256 craftingTime;
        bool isActive;
    }
    
    // 存储映射
    mapping(uint256 => EquipmentAttributes) public equipment;
    mapping(EquipmentType => mapping(Rarity => CraftingRecipe)) public craftingRecipes;
    mapping(address => uint256[]) public playerEquipment;
    
    // 事件
    event EquipmentCrafted(
        address indexed owner,
        uint256 indexed tokenId,
        EquipmentType equipmentType,
        Rarity rarity
    );
    event EquipmentEquipped(uint256 indexed tokenId, uint256 indexed heroId);
    event EquipmentUnequipped(uint256 indexed tokenId, uint256 indexed heroId);
    event EquipmentUpgraded(uint256 indexed tokenId, uint256 newLevel);
    
    constructor(address _mwarToken) ERC721("Monad Warriors Equipment", "MWE") Ownable(msg.sender) {
        require(_mwarToken != address(0), "Invalid MWAR token address");
        mwarToken = MWARToken(_mwarToken);
        
        // 初始化制作配方
        _initializeCraftingRecipes();
    }
    
    /**
     * @dev 初始化制作配方
     */
    function _initializeCraftingRecipes() internal {
        // 武器制作成本
        craftingRecipes[EquipmentType.Weapon][Rarity.Common] = CraftingRecipe(50 * 10**18, 300, true);
        craftingRecipes[EquipmentType.Weapon][Rarity.Rare] = CraftingRecipe(150 * 10**18, 600, true);
        craftingRecipes[EquipmentType.Weapon][Rarity.Epic] = CraftingRecipe(400 * 10**18, 1200, true);
        craftingRecipes[EquipmentType.Weapon][Rarity.Legendary] = CraftingRecipe(1000 * 10**18, 2400, true);
        
        // 护甲制作成本
        craftingRecipes[EquipmentType.Armor][Rarity.Common] = CraftingRecipe(40 * 10**18, 300, true);
        craftingRecipes[EquipmentType.Armor][Rarity.Rare] = CraftingRecipe(120 * 10**18, 600, true);
        craftingRecipes[EquipmentType.Armor][Rarity.Epic] = CraftingRecipe(320 * 10**18, 1200, true);
        craftingRecipes[EquipmentType.Armor][Rarity.Legendary] = CraftingRecipe(800 * 10**18, 2400, true);
        
        // 饰品制作成本
        craftingRecipes[EquipmentType.Accessory][Rarity.Common] = CraftingRecipe(30 * 10**18, 300, true);
        craftingRecipes[EquipmentType.Accessory][Rarity.Rare] = CraftingRecipe(90 * 10**18, 600, true);
        craftingRecipes[EquipmentType.Accessory][Rarity.Epic] = CraftingRecipe(240 * 10**18, 1200, true);
        craftingRecipes[EquipmentType.Accessory][Rarity.Legendary] = CraftingRecipe(600 * 10**18, 2400, true);
    }
    
    /**
     * @dev 制作装备
     */
    function craftEquipment(
        EquipmentType equipmentType,
        Rarity rarity,
        string memory name
    ) external whenNotPaused {
        CraftingRecipe memory recipe = craftingRecipes[equipmentType][rarity];
        require(recipe.isActive, "Recipe not active");
        require(mwarToken.balanceOf(msg.sender) >= recipe.mwarCost, "Insufficient MWAR balance");
        
        // 转账MWAR代币作为制作费用
        mwarToken.transferFrom(msg.sender, address(this), recipe.mwarCost);
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        // 生成装备属性
        EquipmentAttributes memory attributes = _generateEquipmentAttributes(
            name,
            equipmentType,
            rarity
        );
        equipment[tokenId] = attributes;
        
        _safeMint(msg.sender, tokenId);
        playerEquipment[msg.sender].push(tokenId);
        
        emit EquipmentCrafted(msg.sender, tokenId, equipmentType, rarity);
    }
    
    /**
     * @dev 生成装备属性
     */
    function _generateEquipmentAttributes(
        string memory name,
        EquipmentType equipmentType,
        Rarity rarity
    ) internal view returns (EquipmentAttributes memory) {
        // 基础属性值
        uint256 baseStats = 20;
        uint256 rarityMultiplier = 100 + uint256(rarity) * 50; // 100%, 150%, 200%, 250%
        
        // 根据装备类型分配属性
        (uint256 str, uint256 intel, uint256 agi, uint256 vit, uint256 luck) = 
            _getEquipmentTypeStats(equipmentType);
        
        uint256 durability = 100 + uint256(rarity) * 50; // 基础耐久度
        
        return EquipmentAttributes({
            name: name,
            equipmentType: equipmentType,
            rarity: rarity,
            level: 1,
            strengthBonus: (baseStats * str * rarityMultiplier) / 10000,
            intelligenceBonus: (baseStats * intel * rarityMultiplier) / 10000,
            agilityBonus: (baseStats * agi * rarityMultiplier) / 10000,
            vitalityBonus: (baseStats * vit * rarityMultiplier) / 10000,
            luckBonus: (baseStats * luck * rarityMultiplier) / 10000,
            durability: durability,
            maxDurability: durability,
            craftTime: block.timestamp,
            isEquipped: false,
            equippedToHero: 0
        });
    }
    
    /**
     * @dev 获取装备类型属性分配
     */
    function _getEquipmentTypeStats(EquipmentType equipmentType) internal pure returns (
        uint256 str, uint256 intel, uint256 agi, uint256 vit, uint256 luck
    ) {
        if (equipmentType == EquipmentType.Weapon) {
            return (150, 100, 120, 80, 100);  // 武器: 高攻击属性
        } else if (equipmentType == EquipmentType.Armor) {
            return (100, 80, 80, 150, 90);    // 护甲: 高防御属性
        } else { // Accessory
            return (90, 120, 110, 90, 140);   // 饰品: 高辅助属性
        }
    }
    
    /**
     * @dev 装备到英雄
     */
    function equipToHero(uint256 tokenId, uint256 heroId) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner of equipment");
        require(!equipment[tokenId].isEquipped, "Equipment already equipped");
        
        equipment[tokenId].isEquipped = true;
        equipment[tokenId].equippedToHero = heroId;
        
        emit EquipmentEquipped(tokenId, heroId);
    }
    
    /**
     * @dev 卸下装备
     */
    function unequipFromHero(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner of equipment");
        require(equipment[tokenId].isEquipped, "Equipment not equipped");
        
        uint256 heroId = equipment[tokenId].equippedToHero;
        equipment[tokenId].isEquipped = false;
        equipment[tokenId].equippedToHero = 0;
        
        emit EquipmentUnequipped(tokenId, heroId);
    }
    
    /**
     * @dev 升级装备
     */
    function upgradeEquipment(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner of equipment");
        
        EquipmentAttributes storage equip = equipment[tokenId];
        require(equip.level < 20, "Equipment already at max level");
        
        uint256 upgradeCost = 50 * 10**18 * equip.level; // 升级成本递增
        require(mwarToken.balanceOf(msg.sender) >= upgradeCost, "Insufficient MWAR balance");
        
        mwarToken.transferFrom(msg.sender, address(this), upgradeCost);
        
        // 升级装备
        equip.level++;
        
        // 提升属性 (每级提升5%)
        uint256 boost = 105; // 1.05倍
        equip.strengthBonus = (equip.strengthBonus * boost) / 100;
        equip.intelligenceBonus = (equip.intelligenceBonus * boost) / 100;
        equip.agilityBonus = (equip.agilityBonus * boost) / 100;
        equip.vitalityBonus = (equip.vitalityBonus * boost) / 100;
        equip.luckBonus = (equip.luckBonus * boost) / 100;
        
        emit EquipmentUpgraded(tokenId, equip.level);
    }
    
    /**
     * @dev 获取玩家的装备列表
     */
    function getPlayerEquipment(address player) external view returns (uint256[] memory) {
        return playerEquipment[player];
    }
    
    /**
     * @dev 获取装备属性
     */
    function getEquipmentAttributes(uint256 tokenId) external view returns (EquipmentAttributes memory) {
        require(_ownerOf(tokenId) != address(0), "Equipment does not exist");
        return equipment[tokenId];
    }
    
    /**
     * @dev 批量获取装备属性
     */
    function getEquipmentsAttributes(uint256[] calldata tokenIds) 
        external view returns (EquipmentAttributes[] memory) {
        EquipmentAttributes[] memory attributes = new EquipmentAttributes[](tokenIds.length);
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(_ownerOf(tokenIds[i]) != address(0), "Equipment does not exist");
            attributes[i] = equipment[tokenIds[i]];
        }
        
        return attributes;
    }
    
    /**
     * @dev 获取英雄装备的装备
     */
    function getHeroEquipment(uint256 heroId) external view returns (uint256[] memory) {
        uint256[] memory heroEquipment = new uint256[](3); // 最多3件装备
        uint256 count = 0;
        
        for (uint256 i = 0; i < _tokenIdCounter; i++) {
            if (equipment[i].isEquipped && equipment[i].equippedToHero == heroId) {
                if (count < 3) {
                    heroEquipment[count] = i;
                    count++;
                }
            }
        }
        
        // 调整数组大小
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = heroEquipment[i];
        }
        
        return result;
    }
    
    // 重写必要的函数
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
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

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
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
