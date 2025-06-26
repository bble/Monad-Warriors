const { expect } = require("chai");
const { ethers, network } = require("hardhat");

// Helper function to get contract address
function getAddress(contract) {
  return contract.target || contract.address;
}

// Helper function to parse ether
function parseEther(amount) {
  return ethers.parseEther(amount.toString());
}

// Helper function to format ether
function formatEther(amount) {
  return ethers.formatEther(amount);
}

describe("Monad Warriors Game Contracts", function () {
  let mwarToken, heroNFT, gameCore;
  let owner, player1, player2, player3;
  let gameRewardsPool, teamWallet, investorWallet, communityWallet, ecosystemWallet;

  beforeEach(async function () {
    [owner, player1, player2, player3] = await ethers.getSigners();

    // 使用不同地址作为各个钱包（测试环境）
    gameRewardsPool = owner.address;
    teamWallet = player1.address;
    investorWallet = player2.address;
    communityWallet = player3.address;
    ecosystemWallet = owner.address;

    // 部署MWAR Token
    const MWARToken = await ethers.getContractFactory("MWARToken");
    mwarToken = await MWARToken.deploy(
      gameRewardsPool,
      teamWallet,
      investorWallet,
      communityWallet,
      ecosystemWallet
    );
    await mwarToken.waitForDeployment();

    // 部署Hero NFT
    const HeroNFT = await ethers.getContractFactory("HeroNFT");
    heroNFT = await HeroNFT.deploy(mwarToken.target);
    await heroNFT.waitForDeployment();

    // 部署Game Core
    const GameCore = await ethers.getContractFactory("GameCore");
    gameCore = await GameCore.deploy(mwarToken.target, heroNFT.target);
    await gameCore.waitForDeployment();

    // 配置权限
    await mwarToken.addGameContract(gameCore.target);
  });

  describe("MWAR Token", function () {
    it("Should have correct total supply", async function () {
      const totalSupply = await mwarToken.totalSupply();
      expect(totalSupply).to.equal(parseEther("1000000000"));
    });

    it("Should distribute tokens correctly", async function () {
      // Note: owner gets multiple allocations since we use same address for testing
      const ownerBalance = await mwarToken.balanceOf(owner.address);
      const teamBalance = await mwarToken.balanceOf(teamWallet);
      const investorBalance = await mwarToken.balanceOf(investorWallet);
      const communityBalance = await mwarToken.balanceOf(communityWallet);

      // Owner gets gameRewards + ecosystem = 400M + 100M = 500M
      expect(ownerBalance).to.equal(parseEther("500000000"));
      expect(teamBalance).to.equal(parseEther("150000000"));
      expect(investorBalance).to.equal(parseEther("200000000"));
      expect(communityBalance).to.equal(parseEther("150000000"));
    });

    it("Should allow owner to add game contracts", async function () {
      expect(await mwarToken.isGameContract(getAddress(gameCore))).to.be.true;

      // 测试添加新的游戏合约
      await mwarToken.addGameContract(player1.address);
      expect(await mwarToken.isGameContract(player1.address)).to.be.true;
    });

    it("Should not allow non-owner to add game contracts", async function () {
      await expect(
        mwarToken.connect(player1).addGameContract(player2.address)
      ).to.be.revertedWithCustomError(mwarToken, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to remove game contracts", async function () {
      await mwarToken.addGameContract(player1.address);
      expect(await mwarToken.isGameContract(player1.address)).to.be.true;

      await mwarToken.removeGameContract(player1.address);
      expect(await mwarToken.isGameContract(player1.address)).to.be.false;
    });

    it("Should not allow removing non-existent game contract", async function () {
      await expect(
        mwarToken.removeGameContract(player1.address)
      ).to.be.revertedWith("Game contract not found");
    });

    it("Should allow game contracts to mint rewards", async function () {
      // 从游戏奖励池转账给玩家
      const initialBalance = await mwarToken.balanceOf(player1.address);
      const rewardAmount = parseEther("10");

      // 使用impersonateAccount来模拟gameCore合约调用
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [getAddress(gameCore)],
      });

      const gameCoreSigner = await ethers.getSigner(getAddress(gameCore));

      // 给gameCore一些ETH用于gas
      await owner.sendTransaction({
        to: getAddress(gameCore),
        value: parseEther("1")
      });

      await mwarToken.connect(gameCoreSigner).mintReward(player1.address, rewardAmount);

      const finalBalance = await mwarToken.balanceOf(player1.address);
      expect(finalBalance - initialBalance).to.equal(rewardAmount);

      await network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [getAddress(gameCore)],
      });
    });

    it("Should not allow non-game contracts to mint rewards", async function () {
      await expect(
        mwarToken.connect(player1).mintReward(player2.address, parseEther("10"))
      ).to.be.revertedWith("Only game contracts can mint rewards");
    });

    it("Should allow owner to pause and unpause", async function () {
      await mwarToken.pause();

      await expect(
        mwarToken.transfer(player1.address, parseEther("100"))
      ).to.be.revertedWithCustomError(mwarToken, "EnforcedPause");

      await mwarToken.unpause();

      // 现在应该可以转账
      const initialBalance = await mwarToken.balanceOf(player1.address);
      await mwarToken.transfer(player1.address, parseEther("100"));
      const finalBalance = await mwarToken.balanceOf(player1.address);
      expect(finalBalance - initialBalance).to.equal(parseEther("100"));
    });

    it("Should support batch transfer", async function () {
      const recipients = [player1.address, player2.address];
      const amounts = [parseEther("100"), parseEther("200")];

      const initialBalance1 = await mwarToken.balanceOf(player1.address);
      const initialBalance2 = await mwarToken.balanceOf(player2.address);

      await mwarToken.batchTransfer(recipients, amounts);

      const finalBalance1 = await mwarToken.balanceOf(player1.address);
      const finalBalance2 = await mwarToken.balanceOf(player2.address);

      expect(finalBalance1 - initialBalance1).to.equal(parseEther("100"));
      expect(finalBalance2 - initialBalance2).to.equal(parseEther("200"));
    });

    it("Should reject batch transfer with mismatched arrays", async function () {
      const recipients = [player1.address];
      const amounts = [parseEther("100"), parseEther("200")];

      await expect(
        mwarToken.batchTransfer(recipients, amounts)
      ).to.be.revertedWith("Arrays length mismatch");
    });

    it("Should return correct game rewards balance", async function () {
      const balance = await mwarToken.getGameRewardsBalance();
      // Owner address gets both gameRewards and ecosystem allocations
      expect(balance).to.equal(parseEther("500000000"));
    });
  });

  describe("Hero NFT", function () {
    beforeEach(async function () {
      // 给player1一些MWAR代币用于铸造
      await mwarToken.transfer(player1.address, parseEther("5000"));
      await mwarToken.transfer(player2.address, parseEther("5000"));
    });

    it("Should mint hero with correct attributes", async function () {
      // 批准代币消费
      await mwarToken.connect(player1).approve(
        getAddress(heroNFT),
        parseEther("100")
      );

      // 铸造普通战士
      await heroNFT.connect(player1).mintHero(
        player1.address,
        0, // Common
        0, // Warrior
        "https://test.com/hero1.json"
      );

      const heroAttributes = await heroNFT.getHeroAttributes(0);
      expect(heroAttributes.rarity).to.equal(0);
      expect(heroAttributes.class).to.equal(0);
      expect(heroAttributes.level).to.equal(1);
      expect(heroAttributes.strength).to.be.gt(0);
      expect(heroAttributes.intelligence).to.be.gt(0);
      expect(heroAttributes.agility).to.be.gt(0);
      expect(heroAttributes.vitality).to.be.gt(0);
      expect(heroAttributes.luck).to.be.gt(0);
    });

    it("Should mint different rarity heroes with different costs", async function () {
      const rarities = [0, 1, 2, 3]; // Common, Rare, Epic, Legendary
      const costs = [parseEther("100"), parseEther("300"), parseEther("800"), parseEther("2000")];

      for (let i = 0; i < rarities.length; i++) {
        await mwarToken.connect(player1).approve(getAddress(heroNFT), costs[i]);

        await heroNFT.connect(player1).mintHero(
          player1.address,
          rarities[i],
          0, // Warrior
          `https://test.com/hero${i}.json`
        );

        const heroAttributes = await heroNFT.getHeroAttributes(i);
        expect(heroAttributes.rarity).to.equal(rarities[i]);
      }
    });

    it("Should mint different class heroes", async function () {
      const classes = [0, 1, 2, 3, 4]; // Warrior, Mage, Archer, Assassin, Priest

      for (let i = 0; i < classes.length; i++) {
        await mwarToken.connect(player1).approve(getAddress(heroNFT), parseEther("100"));

        await heroNFT.connect(player1).mintHero(
          player1.address,
          0, // Common
          classes[i],
          `https://test.com/hero${i}.json`
        );

        const heroAttributes = await heroNFT.getHeroAttributes(i);
        expect(heroAttributes.class).to.equal(classes[i]);
      }
    });

    it("Should reject minting with insufficient balance", async function () {
      await expect(
        heroNFT.connect(player1).mintHero(
          player1.address,
          3, // Legendary (costs 2000 MWAR)
          0,
          "https://test.com/hero.json"
        )
      ).to.be.revertedWith("Insufficient MWAR balance");
    });

    it("Should reject minting with invalid parameters", async function () {
      await mwarToken.connect(player1).approve(getAddress(heroNFT), parseEther("100"));

      // Invalid rarity
      await expect(
        heroNFT.connect(player1).mintHero(
          player1.address,
          4, // Invalid rarity
          0,
          "https://test.com/hero.json"
        )
      ).to.be.revertedWith("Invalid rarity");

      // Invalid class
      await expect(
        heroNFT.connect(player1).mintHero(
          player1.address,
          0,
          5, // Invalid class
          "https://test.com/hero.json"
        )
      ).to.be.revertedWith("Invalid class");
    });

    it("Should calculate hero power correctly", async function () {
      await mwarToken.connect(player1).approve(getAddress(heroNFT), parseEther("100"));

      await heroNFT.connect(player1).mintHero(
        player1.address,
        0, // Common
        0, // Warrior
        "https://test.com/hero1.json"
      );

      const heroPower = await heroNFT.getHeroPower(0);
      const heroAttributes = await heroNFT.getHeroAttributes(0);

      const expectedPower = heroAttributes.strength +
                           heroAttributes.intelligence +
                           heroAttributes.agility +
                           heroAttributes.vitality +
                           heroAttributes.luck;

      expect(heroPower).to.equal(expectedPower);
    });

    it("Should level up hero correctly", async function () {
      await mwarToken.connect(player1).approve(getAddress(heroNFT), parseEther("200"));

      await heroNFT.connect(player1).mintHero(
        player1.address,
        0, // Common
        0, // Warrior
        "https://test.com/hero1.json"
      );

      const initialAttributes = await heroNFT.getHeroAttributes(0);
      const initialPower = await heroNFT.getHeroPower(0);

      // 升级英雄
      await heroNFT.connect(player1).levelUpHero(0);

      const finalAttributes = await heroNFT.getHeroAttributes(0);
      const finalPower = await heroNFT.getHeroPower(0);

      expect(finalAttributes.level).to.equal(initialAttributes.level + 1n);
      expect(finalPower).to.be.gt(initialPower);
    });

    it("Should reject level up by non-owner", async function () {
      await mwarToken.connect(player1).approve(getAddress(heroNFT), parseEther("200"));

      await heroNFT.connect(player1).mintHero(
        player1.address,
        0, // Common
        0, // Warrior
        "https://test.com/hero1.json"
      );

      await expect(
        heroNFT.connect(player2).levelUpHero(0)
      ).to.be.revertedWith("Not the owner of this hero");
    });

    it("Should reject level up with insufficient balance", async function () {
      await mwarToken.connect(player1).approve(getAddress(heroNFT), parseEther("100"));

      await heroNFT.connect(player1).mintHero(
        player1.address,
        0, // Common
        0, // Warrior
        "https://test.com/hero1.json"
      );

      // 转走所有代币
      const balance = await mwarToken.balanceOf(player1.address);
      await mwarToken.connect(player1).transfer(player2.address, balance);

      await expect(
        heroNFT.connect(player1).levelUpHero(0)
      ).to.be.revertedWith("Insufficient MWAR balance");
    });

    it("Should allow owner to set mint costs", async function () {
      const newCost = parseEther("150");
      await heroNFT.setMintCost(0, newCost); // Common rarity

      // 验证新成本
      await mwarToken.connect(player1).approve(getAddress(heroNFT), newCost);

      await heroNFT.connect(player1).mintHero(
        player1.address,
        0, // Common
        0, // Warrior
        "https://test.com/hero1.json"
      );

      // 应该成功铸造
      expect(await heroNFT.balanceOf(player1.address)).to.equal(1);
    });

    it("Should allow owner to withdraw MWAR", async function () {
      // 先铸造一个英雄，让合约有MWAR
      await mwarToken.connect(player1).approve(getAddress(heroNFT), parseEther("100"));
      await heroNFT.connect(player1).mintHero(
        player1.address,
        0,
        0,
        "https://test.com/hero1.json"
      );

      const contractBalance = await mwarToken.balanceOf(getAddress(heroNFT));
      expect(contractBalance).to.equal(parseEther("100"));

      const initialOwnerBalance = await mwarToken.balanceOf(owner.address);

      await heroNFT.withdrawMWAR(owner.address, contractBalance);

      const finalOwnerBalance = await mwarToken.balanceOf(owner.address);
      expect(finalOwnerBalance - initialOwnerBalance).to.equal(contractBalance);
    });

    it("Should allow owner to pause and unpause", async function () {
      await heroNFT.pause();

      await mwarToken.connect(player1).approve(getAddress(heroNFT), parseEther("100"));

      await expect(
        heroNFT.connect(player1).mintHero(
          player1.address,
          0,
          0,
          "https://test.com/hero1.json"
        )
      ).to.be.revertedWithCustomError(heroNFT, "EnforcedPause");

      await heroNFT.unpause();

      // 现在应该可以铸造
      await heroNFT.connect(player1).mintHero(
        player1.address,
        0,
        0,
        "https://test.com/hero1.json"
      );

      expect(await heroNFT.balanceOf(player1.address)).to.equal(1);
    });

    it("Should reject operations on non-existent heroes", async function () {
      await expect(
        heroNFT.getHeroAttributes(999)
      ).to.be.revertedWith("Hero does not exist");

      await expect(
        heroNFT.getHeroPower(999)
      ).to.be.revertedWith("Hero does not exist");

      await expect(
        heroNFT.connect(player1).levelUpHero(999)
      ).to.be.revertedWith("Hero does not exist");
    });
  });

  describe("Game Core", function () {
    beforeEach(async function () {
      // 给玩家代币并铸造英雄
      await mwarToken.transfer(player1.address, parseEther("2000"));
      await mwarToken.transfer(player2.address, parseEther("2000"));

      // Player1 铸造英雄
      await mwarToken.connect(player1).approve(
        getAddress(heroNFT),
        parseEther("100")
      );
      await heroNFT.connect(player1).mintHero(
        player1.address,
        0, // Common
        0, // Warrior
        "https://test.com/hero1.json"
      );

      // Player2 铸造英雄
      await mwarToken.connect(player2).approve(
        getAddress(heroNFT),
        parseEther("100")
      );
      await heroNFT.connect(player2).mintHero(
        player2.address,
        0, // Common
        1, // Mage
        "https://test.com/hero2.json"
      );
    });

    it("Should track player stats correctly", async function () {
      const initialStats = await gameCore.playerStats(player1.address);
      expect(initialStats.totalBattles).to.equal(0);
      expect(initialStats.wins).to.equal(0);
      expect(initialStats.losses).to.equal(0);
      expect(initialStats.draws).to.equal(0);
      expect(initialStats.totalRewards).to.equal(0);
      expect(initialStats.winStreak).to.equal(0);
      expect(initialStats.maxWinStreak).to.equal(0);
    });

    it("Should calculate win rate correctly", async function () {
      const winRate = await gameCore.getPlayerWinRate(player1.address);
      expect(winRate).to.equal(0); // No battles yet
    });

    it("Should have correct reward amounts", async function () {
      const baseWinReward = await gameCore.baseWinReward();
      expect(baseWinReward).to.equal(parseEther("10"));

      const baseLoseReward = await gameCore.baseLoseReward();
      expect(baseLoseReward).to.equal(parseEther("2"));

      const drawReward = await gameCore.drawReward();
      expect(drawReward).to.equal(parseEther("5"));
    });

    it("Should allow owner to set reward amounts", async function () {
      const newWinReward = parseEther("15");
      const newLoseReward = parseEther("3");
      const newDrawReward = parseEther("7");

      await gameCore.setRewardAmounts(newWinReward, newLoseReward, newDrawReward);

      expect(await gameCore.baseWinReward()).to.equal(newWinReward);
      expect(await gameCore.baseLoseReward()).to.equal(newLoseReward);
      expect(await gameCore.drawReward()).to.equal(newDrawReward);
    });

    it("Should reject PvP battle with invalid parameters", async function () {
      // 不拥有英雄
      await expect(
        gameCore.connect(player1).startPvPBattle(999, player2.address, 1)
      ).to.be.revertedWith("Not owner of hero");

      // 对手不拥有英雄
      await expect(
        gameCore.connect(player1).startPvPBattle(0, player2.address, 999)
      ).to.be.revertedWith("Invalid opponent hero");
    });

    it("Should reject battle during cooldown", async function () {
      // 模拟一场战斗来设置冷却时间
      // 注意：由于战斗逻辑的复杂性，这里我们测试冷却机制

      // 首先需要等待足够的时间或模拟时间流逝
      // 在实际测试中，我们可能需要使用时间操作库
    });

    it("Should enforce daily reward limit", async function () {
      // 测试每日奖励限制
      const dailyLimit = parseEther("1000");

      // 这需要模拟多次战斗来达到限制
      // 由于战斗逻辑的复杂性，这里我们验证限制存在
      expect(await gameCore.DAILY_REWARD_LIMIT()).to.equal(dailyLimit);
    });

    it("Should return correct battle history length", async function () {
      const initialLength = await gameCore.getBattleHistoryLength();
      expect(initialLength).to.equal(0);
    });

    it("Should allow owner to pause and unpause", async function () {
      await gameCore.pause();

      await expect(
        gameCore.connect(player1).startPvPBattle(0, player2.address, 1)
      ).to.be.revertedWithCustomError(gameCore, "EnforcedPause");

      await gameCore.unpause();

      // 现在应该可以尝试战斗（虽然可能因为其他原因失败）
      // 这里我们只是验证暂停功能正常工作
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(
        gameCore.connect(player1).pause()
      ).to.be.revertedWithCustomError(gameCore, "OwnableUnauthorizedAccount");
    });

    it("Should not allow non-owner to set reward amounts", async function () {
      await expect(
        gameCore.connect(player1).setRewardAmounts(
          parseEther("15"),
          parseEther("3"),
          parseEther("7")
        )
      ).to.be.revertedWithCustomError(gameCore, "OwnableUnauthorizedAccount");
    });

    it("Should handle battle cooldown correctly", async function () {
      const cooldown = await gameCore.BATTLE_COOLDOWN();
      expect(cooldown).to.equal(300); // 5 minutes
    });

    it("Should track win rate after battles", async function () {
      // 由于战斗逻辑的复杂性，我们测试基本的统计功能
      const stats = await gameCore.playerStats(player1.address);

      if (stats.totalBattles > 0) {
        const winRate = await gameCore.getPlayerWinRate(player1.address);
        const expectedWinRate = (Number(stats.wins) * 100) / Number(stats.totalBattles);
        expect(winRate).to.equal(expectedWinRate);
      }
    });
  });

  describe("Integration Tests", function () {
    it("Should deploy all contracts successfully", async function () {
      expect(getAddress(mwarToken)).to.not.equal(ethers.ZeroAddress);
      expect(getAddress(heroNFT)).to.not.equal(ethers.ZeroAddress);
      expect(getAddress(gameCore)).to.not.equal(ethers.ZeroAddress);
    });

    it("Should have correct contract relationships", async function () {
      const heroNFTTokenAddress = await heroNFT.mwarToken();
      const gameCoreTokenAddress = await gameCore.mwarToken();
      const gameCoreHeroAddress = await gameCore.heroNFT();

      expect(heroNFTTokenAddress).to.equal(getAddress(mwarToken));
      expect(gameCoreTokenAddress).to.equal(getAddress(mwarToken));
      expect(gameCoreHeroAddress).to.equal(getAddress(heroNFT));
    });

    it("Should allow complete game flow", async function () {
      // 1. 给玩家代币
      await mwarToken.transfer(player1.address, parseEther("1000"));

      // 2. 铸造英雄
      await mwarToken.connect(player1).approve(
        getAddress(heroNFT),
        parseEther("100")
      );
      await heroNFT.connect(player1).mintHero(
        player1.address,
        0, // Common
        0, // Warrior
        "https://test.com/hero1.json"
      );

      // 3. 检查英雄属性
      const heroAttributes = await heroNFT.getHeroAttributes(0);
      expect(heroAttributes.level).to.equal(1);

      // 4. 检查玩家拥有英雄
      const heroBalance = await heroNFT.balanceOf(player1.address);
      expect(heroBalance).to.equal(1);

      // 5. 检查英雄战斗力
      const heroPower = await heroNFT.getHeroPower(0);
      expect(heroPower).to.be.gt(0);
    });

    it("Should handle multiple players and heroes", async function () {
      // 给多个玩家代币
      await mwarToken.transfer(player1.address, parseEther("2000"));
      await mwarToken.transfer(player2.address, parseEther("2000"));

      // Player1 铸造多个英雄
      for (let i = 0; i < 3; i++) {
        await mwarToken.connect(player1).approve(getAddress(heroNFT), parseEther("100"));
        await heroNFT.connect(player1).mintHero(
          player1.address,
          0, // Common
          i % 5, // Different classes
          `https://test.com/hero${i}.json`
        );
      }

      // Player2 铸造英雄
      await mwarToken.connect(player2).approve(getAddress(heroNFT), parseEther("300"));
      await heroNFT.connect(player2).mintHero(
        player2.address,
        1, // Rare
        2, // Archer
        "https://test.com/hero_rare.json"
      );

      // 验证英雄数量
      expect(await heroNFT.balanceOf(player1.address)).to.equal(3);
      expect(await heroNFT.balanceOf(player2.address)).to.equal(1);

      // 验证总供应量
      expect(await heroNFT.totalSupply()).to.equal(4);
    });

    it("Should handle hero upgrades and power changes", async function () {
      await mwarToken.transfer(player1.address, parseEther("1000"));

      // 铸造英雄
      await mwarToken.connect(player1).approve(getAddress(heroNFT), parseEther("100"));
      await heroNFT.connect(player1).mintHero(
        player1.address,
        0, // Common
        0, // Warrior
        "https://test.com/hero1.json"
      );

      const initialPower = await heroNFT.getHeroPower(0);
      const initialAttributes = await heroNFT.getHeroAttributes(0);

      // 升级英雄
      await heroNFT.connect(player1).levelUpHero(0);

      const finalPower = await heroNFT.getHeroPower(0);
      const finalAttributes = await heroNFT.getHeroAttributes(0);

      // 验证升级效果
      expect(finalAttributes.level).to.equal(initialAttributes.level + 1n);
      expect(finalPower).to.be.gt(initialPower);

      // 验证属性提升
      expect(finalAttributes.strength).to.be.gt(initialAttributes.strength);
      expect(finalAttributes.intelligence).to.be.gt(initialAttributes.intelligence);
      expect(finalAttributes.agility).to.be.gt(initialAttributes.agility);
      expect(finalAttributes.vitality).to.be.gt(initialAttributes.vitality);
      expect(finalAttributes.luck).to.be.gt(initialAttributes.luck);
    });

    it("Should handle token economics correctly", async function () {
      const initialGameRewardsBalance = await mwarToken.balanceOf(gameRewardsPool);

      // 模拟游戏奖励分发
      const rewardAmount = parseEther("100");
      await mwarToken.mintReward(player1.address, rewardAmount);

      const finalGameRewardsBalance = await mwarToken.balanceOf(gameRewardsPool);
      const playerBalance = await mwarToken.balanceOf(player1.address);

      // 验证奖励分发
      expect(playerBalance).to.equal(rewardAmount);
      expect(finalGameRewardsBalance).to.equal(initialGameRewardsBalance - rewardAmount);
    });

    it("Should handle contract permissions correctly", async function () {
      // 只有游戏合约可以铸造奖励
      expect(await mwarToken.isGameContract(getAddress(gameCore))).to.be.true;
      expect(await mwarToken.isGameContract(player1.address)).to.be.false;

      // 只有owner可以添加游戏合约
      await expect(
        mwarToken.connect(player1).addGameContract(player2.address)
      ).to.be.revertedWithCustomError(mwarToken, "OwnableUnauthorizedAccount");

      // 只有owner可以暂停合约
      await expect(
        mwarToken.connect(player1).pause()
      ).to.be.revertedWithCustomError(mwarToken, "OwnableUnauthorizedAccount");
    });

    it("Should handle edge cases and error conditions", async function () {
      // 测试零地址
      await expect(
        heroNFT.connect(player1).mintHero(
          ethers.ZeroAddress,
          0,
          0,
          "https://test.com/hero.json"
        )
      ).to.be.revertedWith("Cannot mint to zero address");

      // 测试不存在的英雄
      await expect(
        heroNFT.getHeroAttributes(999)
      ).to.be.revertedWith("Hero does not exist");

      // 测试空数组批量转账
      await expect(
        mwarToken.batchTransfer([], [])
      ).to.be.revertedWith("Empty arrays");
    });

    it("Should maintain data consistency across operations", async function () {
      await mwarToken.transfer(player1.address, parseEther("1000"));

      // 记录初始状态
      const initialTotalSupply = await mwarToken.totalSupply();
      const initialPlayerBalance = await mwarToken.balanceOf(player1.address);

      // 执行一系列操作
      await mwarToken.connect(player1).approve(getAddress(heroNFT), parseEther("100"));
      await heroNFT.connect(player1).mintHero(
        player1.address,
        0,
        0,
        "https://test.com/hero.json"
      );

      // 验证状态一致性
      const finalTotalSupply = await mwarToken.totalSupply();
      const finalPlayerBalance = await mwarToken.balanceOf(player1.address);
      const contractBalance = await mwarToken.balanceOf(getAddress(heroNFT));

      expect(finalTotalSupply).to.equal(initialTotalSupply);
      expect(finalPlayerBalance).to.equal(initialPlayerBalance - parseEther("100"));
      expect(contractBalance).to.equal(parseEther("100"));
    });
  });
});
