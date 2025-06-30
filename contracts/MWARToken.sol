// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title MWARToken
 * @dev Monad Warriors游戏代币合约
 * 总供应量: 1,000,000,000 MWAR
 * 功能: 游戏内货币、治理代币、质押奖励
 */
contract MWARToken is ERC20, ERC20Burnable, Ownable, Pausable {
    // 总供应量: 10亿代币
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18;
    
    // 分配比例
    uint256 public constant GAME_REWARDS_ALLOCATION = 400_000_000 * 10**18; // 40%
    uint256 public constant TEAM_ALLOCATION = 150_000_000 * 10**18; // 15%
    uint256 public constant INVESTOR_ALLOCATION = 200_000_000 * 10**18; // 20%
    uint256 public constant COMMUNITY_ALLOCATION = 150_000_000 * 10**18; // 15%
    uint256 public constant ECOSYSTEM_ALLOCATION = 100_000_000 * 10**18; // 10%
    
    // 地址映射
    address public gameRewardsPool;
    address public teamWallet;
    address public investorWallet;
    address public communityWallet;
    address public ecosystemWallet;
    
    // 游戏合约地址映射
    mapping(address => bool) public gameContracts;
    
    // 事件
    event GameContractAdded(address indexed gameContract);
    event GameContractRemoved(address indexed gameContract);
    event TokensDistributed(address indexed to, uint256 amount, string reason);
    
    constructor(
        address _gameRewardsPool,
        address _teamWallet,
        address _investorWallet,
        address _communityWallet,
        address _ecosystemWallet
    ) ERC20("Monad Warriors Token", "MWAR") Ownable(msg.sender) {
        require(_gameRewardsPool != address(0), "Invalid game rewards pool address");
        require(_teamWallet != address(0), "Invalid team wallet address");
        require(_investorWallet != address(0), "Invalid investor wallet address");
        require(_communityWallet != address(0), "Invalid community wallet address");
        require(_ecosystemWallet != address(0), "Invalid ecosystem wallet address");
        
        gameRewardsPool = _gameRewardsPool;
        teamWallet = _teamWallet;
        investorWallet = _investorWallet;
        communityWallet = _communityWallet;
        ecosystemWallet = _ecosystemWallet;
        
        // 分配代币
        _mint(_gameRewardsPool, GAME_REWARDS_ALLOCATION);
        _mint(_teamWallet, TEAM_ALLOCATION);
        _mint(_investorWallet, INVESTOR_ALLOCATION);
        _mint(_communityWallet, COMMUNITY_ALLOCATION);
        _mint(_ecosystemWallet, ECOSYSTEM_ALLOCATION);

        emit TokensDistributed(_gameRewardsPool, GAME_REWARDS_ALLOCATION, "Game Rewards");
        emit TokensDistributed(_teamWallet, TEAM_ALLOCATION, "Team");
        emit TokensDistributed(_investorWallet, INVESTOR_ALLOCATION, "Investor");
        emit TokensDistributed(_communityWallet, COMMUNITY_ALLOCATION, "Community");
        emit TokensDistributed(_ecosystemWallet, ECOSYSTEM_ALLOCATION, "Ecosystem");
    }
    
    /**
     * @dev 添加游戏合约地址，允许游戏合约铸造代币作为奖励
     */
    function addGameContract(address _gameContract) external onlyOwner {
        require(_gameContract != address(0), "Invalid game contract address");
        require(!gameContracts[_gameContract], "Game contract already added");
        
        gameContracts[_gameContract] = true;
        emit GameContractAdded(_gameContract);
    }
    
    /**
     * @dev 移除游戏合约地址
     */
    function removeGameContract(address _gameContract) external onlyOwner {
        require(gameContracts[_gameContract], "Game contract not found");
        
        gameContracts[_gameContract] = false;
        emit GameContractRemoved(_gameContract);
    }
    
    /**
     * @dev 游戏合约铸造代币奖励给玩家
     */
    function mintReward(address to, uint256 amount) external {
        require(gameContracts[msg.sender], "Only game contracts can mint rewards");
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        // 从游戏奖励池转账而不是铸造新代币
        _transfer(gameRewardsPool, to, amount);
        emit TokensDistributed(to, amount, "Game Reward");
    }
    
    /**
     * @dev 暂停代币转账
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev 恢复代币转账
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev 重写更新函数以支持暂停功能
     */
    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        super._update(from, to, value);
    }
    
    /**
     * @dev 批量转账功能
     */
    function batchTransfer(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length > 0, "Empty arrays");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient address");
            require(amounts[i] > 0, "Invalid amount");
            _transfer(msg.sender, recipients[i], amounts[i]);
        }
    }
    
    /**
     * @dev 获取游戏奖励池余额
     */
    function getGameRewardsBalance() external view returns (uint256) {
        return balanceOf(gameRewardsPool);
    }
    
    /**
     * @dev 检查地址是否为游戏合约
     */
    function isGameContract(address _contract) external view returns (bool) {
        return gameContracts[_contract];
    }

    // ============ 测试网水龙头功能 ============

    // 每次领取的代币数量 (1000 MWAR)
    uint256 public constant FAUCET_AMOUNT = 1000 * 10**18;

    // 冷却时间 (24小时)
    uint256 public constant COOLDOWN_TIME = 24 hours;

    // 记录用户上次领取时间
    mapping(address => uint256) public lastFaucetClaim;

    // 水龙头事件
    event FaucetClaimed(address indexed user, uint256 amount);

    /**
     * @dev 测试网水龙头 - 用户可以每24小时领取一次代币
     */
    function claimFromFaucet() external {
        require(canClaimFromFaucet(msg.sender), "Must wait 24 hours between claims");
        require(balanceOf(gameRewardsPool) >= FAUCET_AMOUNT, "Faucet is empty");

        // 更新领取时间
        lastFaucetClaim[msg.sender] = block.timestamp;

        // 从游戏奖励池转账给用户
        _transfer(gameRewardsPool, msg.sender, FAUCET_AMOUNT);

        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }

    /**
     * @dev 检查用户是否可以从水龙头领取
     */
    function canClaimFromFaucet(address user) public view returns (bool) {
        return block.timestamp >= lastFaucetClaim[user] + COOLDOWN_TIME;
    }

    /**
     * @dev 获取用户下次可以领取的时间
     */
    function getNextFaucetClaimTime(address user) external view returns (uint256) {
        if (canClaimFromFaucet(user)) {
            return block.timestamp;
        }
        return lastFaucetClaim[user] + COOLDOWN_TIME;
    }

    /**
     * @dev 获取距离下次领取的剩余时间（秒）
     */
    function getTimeUntilNextFaucetClaim(address user) external view returns (uint256) {
        if (canClaimFromFaucet(user)) {
            return 0;
        }
        return (lastFaucetClaim[user] + COOLDOWN_TIME) - block.timestamp;
    }

    /**
     * @dev 管理员分发测试代币给用户
     */
    function distributeTestTokens(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot distribute to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(gameRewardsPool) >= amount, "Insufficient pool balance");

        // 从游戏奖励池转账给用户
        _transfer(gameRewardsPool, to, amount);

        emit TokensDistributed(to, amount, "Test Distribution");
    }

    /**
     * @dev 批量分发测试代币
     */
    function batchDistributeTestTokens(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length > 0, "Empty arrays");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient address");
            require(amounts[i] > 0, "Invalid amount");
            require(balanceOf(gameRewardsPool) >= amounts[i], "Insufficient pool balance");

            _transfer(gameRewardsPool, recipients[i], amounts[i]);
            emit TokensDistributed(recipients[i], amounts[i], "Batch Test Distribution");
        }
    }
}
