// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MWARFaucet
 * @dev 测试网MWAR代币水龙头
 * 允许用户每24小时领取一次测试代币
 */
contract MWARFaucet is Ownable, ReentrancyGuard {
    IERC20 public mwarToken;
    
    // 每次领取的代币数量 (1000 MWAR)
    uint256 public constant FAUCET_AMOUNT = 1000 * 10**18;
    
    // 冷却时间 (24小时)
    uint256 public constant COOLDOWN_TIME = 24 hours;
    
    // 记录用户上次领取时间
    mapping(address => uint256) public lastClaimTime;
    
    // 事件
    event TokensClaimed(address indexed user, uint256 amount);
    event FaucetRefilled(uint256 amount);
    
    constructor(address _mwarToken) Ownable(msg.sender) {
        require(_mwarToken != address(0), "Invalid MWAR token address");
        mwarToken = IERC20(_mwarToken);
    }
    
    /**
     * @dev 领取测试代币
     */
    function claimTokens() external nonReentrant {
        require(canClaim(msg.sender), "Must wait 24 hours between claims");
        require(mwarToken.balanceOf(address(this)) >= FAUCET_AMOUNT, "Faucet is empty");
        
        // 更新领取时间
        lastClaimTime[msg.sender] = block.timestamp;
        
        // 转账代币
        require(mwarToken.transfer(msg.sender, FAUCET_AMOUNT), "Token transfer failed");
        
        emit TokensClaimed(msg.sender, FAUCET_AMOUNT);
    }
    
    /**
     * @dev 检查用户是否可以领取
     */
    function canClaim(address user) public view returns (bool) {
        return block.timestamp >= lastClaimTime[user] + COOLDOWN_TIME;
    }
    
    /**
     * @dev 获取用户下次可以领取的时间
     */
    function getNextClaimTime(address user) external view returns (uint256) {
        if (canClaim(user)) {
            return block.timestamp;
        }
        return lastClaimTime[user] + COOLDOWN_TIME;
    }
    
    /**
     * @dev 获取距离下次领取的剩余时间（秒）
     */
    function getTimeUntilNextClaim(address user) external view returns (uint256) {
        if (canClaim(user)) {
            return 0;
        }
        return (lastClaimTime[user] + COOLDOWN_TIME) - block.timestamp;
    }
    
    /**
     * @dev 管理员向水龙头充值代币
     */
    function refillFaucet(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(mwarToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        emit FaucetRefilled(amount);
    }
    
    /**
     * @dev 管理员提取代币
     */
    function withdrawTokens(uint256 amount) external onlyOwner {
        require(amount <= mwarToken.balanceOf(address(this)), "Insufficient balance");
        require(mwarToken.transfer(msg.sender, amount), "Transfer failed");
    }
    
    /**
     * @dev 获取水龙头余额
     */
    function getFaucetBalance() external view returns (uint256) {
        return mwarToken.balanceOf(address(this));
    }
    
    /**
     * @dev 紧急暂停功能
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = mwarToken.balanceOf(address(this));
        if (balance > 0) {
            require(mwarToken.transfer(msg.sender, balance), "Transfer failed");
        }
    }
}
