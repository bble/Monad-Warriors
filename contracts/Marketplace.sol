// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./MWARToken.sol";
import "./HeroNFT.sol";
import "./EquipmentNFT.sol";

/**
 * @title Marketplace
 * @dev NFT市场合约 - 完全链上存储
 */
contract Marketplace is Ownable, Pausable, ReentrancyGuard {
    MWARToken public mwarToken;
    HeroNFT public heroNFT;
    EquipmentNFT public equipmentNFT;
    
    uint256 private _listingIdCounter = 1;
    uint256 public marketplaceFee = 250; // 2.5% (基点)
    uint256 public constant MAX_FEE = 1000; // 10% 最大手续费
    
    // 拍卖类型枚举
    enum ListingType { FixedPrice, Auction }
    
    // 拍卖状态枚举
    enum ListingStatus { Active, Sold, Cancelled, Expired }
    
    // NFT类型枚举
    enum NFTType { Hero, Equipment }
    
    // 市场列表结构
    struct Listing {
        uint256 id;
        address seller;
        NFTType nftType;
        address nftContract;
        uint256 tokenId;
        ListingType listingType;
        uint256 price; // 固定价格或起拍价
        uint256 endTime; // 拍卖结束时间
        address highestBidder;
        uint256 highestBid;
        ListingStatus status;
        uint256 createdAt;
    }
    
    // 出价结构
    struct Bid {
        address bidder;
        uint256 amount;
        uint256 timestamp;
    }
    
    // 存储映射
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Bid[]) public listingBids;
    mapping(address => uint256[]) public userListings;
    mapping(address => uint256) public pendingWithdrawals;
    
    uint256[] public activeListings;
    
    // 事件
    event ItemListed(
        uint256 indexed listingId,
        address indexed seller,
        NFTType nftType,
        uint256 indexed tokenId,
        uint256 price
    );
    event ItemSold(
        uint256 indexed listingId,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );
    event BidPlaced(
        uint256 indexed listingId,
        address indexed bidder,
        uint256 amount
    );
    event ListingCancelled(uint256 indexed listingId);
    event AuctionEnded(uint256 indexed listingId, address winner, uint256 finalPrice);
    
    constructor(
        address _mwarToken,
        address _heroNFT,
        address _equipmentNFT
    ) Ownable(msg.sender) {
        require(_mwarToken != address(0), "Invalid MWAR token address");
        require(_heroNFT != address(0), "Invalid Hero NFT address");
        require(_equipmentNFT != address(0), "Invalid Equipment NFT address");
        
        mwarToken = MWARToken(_mwarToken);
        heroNFT = HeroNFT(_heroNFT);
        equipmentNFT = EquipmentNFT(_equipmentNFT);
    }
    
    /**
     * @dev 上架NFT (固定价格)
     */
    function listItem(
        NFTType nftType,
        uint256 tokenId,
        uint256 price
    ) external whenNotPaused {
        require(price > 0, "Price must be greater than 0");
        
        address nftContract = _getNFTContract(nftType);
        require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Not owner of NFT");
        require(IERC721(nftContract).isApprovedForAll(msg.sender, address(this)) || 
                IERC721(nftContract).getApproved(tokenId) == address(this), "Marketplace not approved");
        
        uint256 listingId = _listingIdCounter;
        _listingIdCounter++;
        
        listings[listingId] = Listing({
            id: listingId,
            seller: msg.sender,
            nftType: nftType,
            nftContract: nftContract,
            tokenId: tokenId,
            listingType: ListingType.FixedPrice,
            price: price,
            endTime: 0,
            highestBidder: address(0),
            highestBid: 0,
            status: ListingStatus.Active,
            createdAt: block.timestamp
        });
        
        userListings[msg.sender].push(listingId);
        activeListings.push(listingId);
        
        emit ItemListed(listingId, msg.sender, nftType, tokenId, price);
    }
    
    /**
     * @dev 创建拍卖
     */
    function createAuction(
        NFTType nftType,
        uint256 tokenId,
        uint256 startingPrice,
        uint256 duration
    ) external whenNotPaused {
        require(startingPrice > 0, "Starting price must be greater than 0");
        require(duration >= 1 hours && duration <= 7 days, "Invalid auction duration");
        
        address nftContract = _getNFTContract(nftType);
        require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Not owner of NFT");
        require(IERC721(nftContract).isApprovedForAll(msg.sender, address(this)) || 
                IERC721(nftContract).getApproved(tokenId) == address(this), "Marketplace not approved");
        
        uint256 listingId = _listingIdCounter;
        _listingIdCounter++;
        
        listings[listingId] = Listing({
            id: listingId,
            seller: msg.sender,
            nftType: nftType,
            nftContract: nftContract,
            tokenId: tokenId,
            listingType: ListingType.Auction,
            price: startingPrice,
            endTime: block.timestamp + duration,
            highestBidder: address(0),
            highestBid: 0,
            status: ListingStatus.Active,
            createdAt: block.timestamp
        });
        
        userListings[msg.sender].push(listingId);
        activeListings.push(listingId);
        
        emit ItemListed(listingId, msg.sender, nftType, tokenId, startingPrice);
    }
    
    /**
     * @dev 购买固定价格物品
     */
    function buyItem(uint256 listingId) external nonReentrant whenNotPaused {
        Listing storage listing = listings[listingId];
        require(listing.status == ListingStatus.Active, "Listing not active");
        require(listing.listingType == ListingType.FixedPrice, "Not a fixed price listing");
        require(msg.sender != listing.seller, "Cannot buy own item");
        
        uint256 totalPrice = listing.price;
        require(mwarToken.balanceOf(msg.sender) >= totalPrice, "Insufficient MWAR balance");
        
        // 计算手续费
        uint256 fee = (totalPrice * marketplaceFee) / 10000;
        uint256 sellerAmount = totalPrice - fee;
        
        // 转账
        mwarToken.transferFrom(msg.sender, listing.seller, sellerAmount);
        if (fee > 0) {
            mwarToken.transferFrom(msg.sender, address(this), fee);
        }
        
        // 转移NFT
        IERC721(listing.nftContract).transferFrom(listing.seller, msg.sender, listing.tokenId);
        
        listing.status = ListingStatus.Sold;
        _removeFromActiveListings(listingId);
        
        emit ItemSold(listingId, listing.seller, msg.sender, totalPrice);
    }
    
    /**
     * @dev 对拍卖出价
     */
    function placeBid(uint256 listingId, uint256 bidAmount) external nonReentrant whenNotPaused {
        Listing storage listing = listings[listingId];
        require(listing.status == ListingStatus.Active, "Listing not active");
        require(listing.listingType == ListingType.Auction, "Not an auction");
        require(block.timestamp < listing.endTime, "Auction ended");
        require(msg.sender != listing.seller, "Cannot bid on own auction");
        require(bidAmount > listing.highestBid, "Bid too low");
        require(bidAmount >= listing.price, "Bid below starting price");
        require(mwarToken.balanceOf(msg.sender) >= bidAmount, "Insufficient MWAR balance");
        
        // 退还前一个最高出价者的资金
        if (listing.highestBidder != address(0)) {
            pendingWithdrawals[listing.highestBidder] += listing.highestBid;
        }
        
        // 锁定新的出价
        mwarToken.transferFrom(msg.sender, address(this), bidAmount);
        
        listing.highestBidder = msg.sender;
        listing.highestBid = bidAmount;
        
        // 记录出价历史
        listingBids[listingId].push(Bid({
            bidder: msg.sender,
            amount: bidAmount,
            timestamp: block.timestamp
        }));
        
        emit BidPlaced(listingId, msg.sender, bidAmount);
    }
    
    /**
     * @dev 结束拍卖
     */
    function endAuction(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.status == ListingStatus.Active, "Listing not active");
        require(listing.listingType == ListingType.Auction, "Not an auction");
        require(block.timestamp >= listing.endTime, "Auction not ended yet");
        
        listing.status = ListingStatus.Sold;
        _removeFromActiveListings(listingId);
        
        if (listing.highestBidder != address(0)) {
            // 计算手续费
            uint256 fee = (listing.highestBid * marketplaceFee) / 10000;
            uint256 sellerAmount = listing.highestBid - fee;
            
            // 转账给卖家
            mwarToken.transfer(listing.seller, sellerAmount);
            
            // 转移NFT给获胜者
            IERC721(listing.nftContract).transferFrom(listing.seller, listing.highestBidder, listing.tokenId);
            
            emit ItemSold(listingId, listing.seller, listing.highestBidder, listing.highestBid);
        } else {
            // 没有出价者，拍卖失败
            listing.status = ListingStatus.Expired;
        }
        
        emit AuctionEnded(listingId, listing.highestBidder, listing.highestBid);
    }
    
    /**
     * @dev 取消上架
     */
    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not the seller");
        require(listing.status == ListingStatus.Active, "Listing not active");
        
        if (listing.listingType == ListingType.Auction && listing.highestBidder != address(0)) {
            // 退还最高出价
            pendingWithdrawals[listing.highestBidder] += listing.highestBid;
        }
        
        listing.status = ListingStatus.Cancelled;
        _removeFromActiveListings(listingId);
        
        emit ListingCancelled(listingId);
    }
    
    /**
     * @dev 提取待提现资金
     */
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds to withdraw");
        
        pendingWithdrawals[msg.sender] = 0;
        mwarToken.transfer(msg.sender, amount);
    }
    
    /**
     * @dev 获取NFT合约地址
     */
    function _getNFTContract(NFTType nftType) internal view returns (address) {
        if (nftType == NFTType.Hero) {
            return address(heroNFT);
        } else {
            return address(equipmentNFT);
        }
    }
    
    /**
     * @dev 从活跃列表中移除
     */
    function _removeFromActiveListings(uint256 listingId) internal {
        for (uint256 i = 0; i < activeListings.length; i++) {
            if (activeListings[i] == listingId) {
                activeListings[i] = activeListings[activeListings.length - 1];
                activeListings.pop();
                break;
            }
        }
    }
    
    /**
     * @dev 获取上架信息
     */
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }
    
    /**
     * @dev 获取活跃上架列表
     */
    function getActiveListings() external view returns (uint256[] memory) {
        return activeListings;
    }
    
    /**
     * @dev 获取用户上架列表
     */
    function getUserListings(address user) external view returns (uint256[] memory) {
        return userListings[user];
    }
    
    /**
     * @dev 获取拍卖出价历史
     */
    function getListingBids(uint256 listingId) external view returns (Bid[] memory) {
        return listingBids[listingId];
    }
    
    /**
     * @dev 设置市场手续费
     */
    function setMarketplaceFee(uint256 _fee) external onlyOwner {
        require(_fee <= MAX_FEE, "Fee too high");
        marketplaceFee = _fee;
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
     * @dev 提取手续费
     */
    function withdrawFees(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        mwarToken.transfer(to, amount);
    }
}
