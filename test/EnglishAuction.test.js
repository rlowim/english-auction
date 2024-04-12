const { ethers } = require("hardhat");
const { expect } = require("chai");
const {
  loadFixture,
  time,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("EnglishAuction", function () {
  async function deployEnglishAuctionFixture() {
    const [signer, acc1, acc2, acc3] = await ethers.getSigners();
    const contract = await ethers.deployContract("EnglishAuction", [
      "Bike",
      300,
      60,
    ]);
    return { contract, signer, acc1, acc2, acc3 };
  }

  async function endedEnglishAuctionFixture() {
    const contract = await ethers.deployContract("EnglishAuction", [
      "Bike",
      300,
      60,
    ]);
    await contract.start();
    await time.increase(61);
    await contract.end();
    return { contract };
  }

  async function twoBidsEnglishAuctionFixture() {
    const [signer, acc1, acc2, acc3] = await ethers.getSigners();
    const contract = await ethers.deployContract("EnglishAuction", [
      "Bike",
      300,
      60,
    ]);
    await contract.start();
    await contract.connect(acc1).bid({ value: 400 });
    await contract.connect(acc2).bid({ value: 500 });
    return { contract, signer, acc1, acc2, acc3 };
  }

  describe("Deployment", function () {
    it("Should be deployed at an address", async function () {
      const { contract } = await loadFixture(deployEnglishAuctionFixture);
      expect(await contract.getAddress()).to.not.be.null;
      expect(await contract.getAddress()).to.be.properAddress;
    });
    it("Should not be able to place bid or end the auction", async function () {
      const { contract, acc1 } = await loadFixture(deployEnglishAuctionFixture);
      await expect(
        contract.connect(acc1).bid({ value: 400 })
      ).to.be.revertedWith("Auction not started yet");
      await expect(contract.connect(acc1).end()).to.be.revertedWith(
        "Auction not started yet"
      );
    });
    it("Should deploy with specified initial value", async function () {
      const { contract, signer } = await loadFixture(
        deployEnglishAuctionFixture
      );
      expect(await contract.endAt()).to.equal(0);
      expect(await contract.started()).to.equal(false);
      expect(await contract.ended()).to.equal(false);
      expect(await contract.highestBidder()).to.equal(ethers.ZeroAddress);

      expect(await contract.item()).to.equal("Bike");
      expect(await contract.highestBid()).to.equal(300);
      expect(await contract.duration()).to.equal(60);
      expect(await contract.seller()).to.equal(signer.address);
    });
  });

  describe("Starting auction", function () {
    it("Should be able to start auction only by seller's account", async function () {
      const { contract, acc1 } = await loadFixture(deployEnglishAuctionFixture);
      await expect(contract.start()).to.not.be.reverted;
      await expect(contract.connect(acc1).start()).to.be.revertedWith(
        "You are not a seller"
      );
    });
    it("Should not be able to start the ongoing auction", async function () {
      const { contract } = await loadFixture(deployEnglishAuctionFixture);
      await contract.start();
      await expect(contract.start()).to.be.revertedWith(
        "Auction has already started!"
      );
    });
    it("Public variable started should be set to true", async function () {
      const { contract } = await loadFixture(deployEnglishAuctionFixture);
      await contract.start();
      expect(await contract.started()).to.equal(true);
    });
    it("An event should be emit when a new auction starts", async function () {
      const { contract } = await loadFixture(deployEnglishAuctionFixture);
      await expect(contract.start()).to.emit(contract, "Start");
    });
  });

  describe("Ending auction", function () {
    it("Should not be able to end auction before it starts", async function () {
      const { contract } = await loadFixture(deployEnglishAuctionFixture);
      await expect(contract.end()).to.be.revertedWith(
        "Auction not started yet"
      );
    });
    it("Should be able to end auction only by seller's account", async function () {
      const { contract, acc1 } = await loadFixture(deployEnglishAuctionFixture);
      await contract.start();
      await time.increase(61);
      await expect(contract.connect(acc1).end()).to.be.revertedWith(
        "You are not a seller"
      );
      await expect(contract.end()).to.not.be.reverted;
    });
    it("Should not be able to end auction when it has ended", async function () {
      const { contract } = await loadFixture(endedEnglishAuctionFixture);
      await expect(contract.end()).to.be.revertedWith("Auction already ended");
      expect(await contract.ended()).to.equal(true);
    });
    it("Should not be able to end of the ongoing auction before the end time", async function () {
      const { contract } = await loadFixture(deployEnglishAuctionFixture);
      await contract.start();
      await expect(contract.end()).to.be.revertedWith(
        "You can not stop auction yet"
      );
    });
    it("Public variable ended should be set to true", async function () {
      const { contract } = await loadFixture(endedEnglishAuctionFixture);
      expect(await contract.ended()).to.equal(true);
    });
    it("Should not transfer the funds to the seller after the end of the auction when no bidders participated in the auction ", async function () {
      const { contract, signer } = await loadFixture(
        deployEnglishAuctionFixture
      );
      await contract.start();
      await time.increase(61);
      await expect(contract.end()).to.changeEtherBalance(signer, 0);
    });
    it("Should transfer the appropriate amount of funds to the seller after the end of the auction when bidders participated", async function () {
      const { contract, signer, acc1 } = await loadFixture(
        deployEnglishAuctionFixture
      );
      await contract.start();
      await contract.connect(acc1).bid({ value: 400 });
      await time.increase(61);
      await expect(contract.end()).to.changeEtherBalance(signer, 400);
    });
    it("An event should be emit when a new auction ends", async function () {
      const { contract, acc1 } = await loadFixture(deployEnglishAuctionFixture);
      await contract.start();
      await contract.connect(acc1).bid({ value: 400 });
      await time.increase(61);
      await expect(contract.end()).to.emit(contract, "End").withArgs(acc1, 400);
    });
  });

  describe("Bidding", function () {
    it("Should not be able to place a bid before the auction starts", async function () {
      const { contract } = await loadFixture(deployEnglishAuctionFixture);
      await expect(contract.bid({ value: 400 })).to.be.revertedWith(
        "Auction not started yet"
      );
    });
    it("Shoud not be able to place a bid after the auction ends", async function () {
      const { contract } = await loadFixture(endedEnglishAuctionFixture);
      await expect(contract.bid()).to.be.rejectedWith("Auction has ended");
    });
    it("Sending bid higher than current highest bid during the auction should complete without an error", async function () {
      const { contract, acc1 } = await loadFixture(deployEnglishAuctionFixture);
      await contract.start();
      await expect(contract.connect(acc1).bid({ value: 400 })).to.not.be
        .reverted;
    });
    it("Shoud not be able to make an offer with less value than current highest bid", async function () {
      const { contract, acc1 } = await loadFixture(deployEnglishAuctionFixture);
      await contract.start();
      await expect(
        contract.connect(acc1).bid({ value: 200 })
      ).to.be.revertedWith("Not enough bid value");
    });
    it("Sending first bid in an auction should not add current value to bids mapping", async function () {
      const { contract, acc1 } = await loadFixture(deployEnglishAuctionFixture);
      await contract.start();
      await contract.connect(acc1).bid({ value: 400 });
      expect(await contract.bids(acc1)).to.equal(0);
    });
    it("Sending the second and subsequent bids in an auction should add current value to bids mapping for the current highest bidder", async function () {
      const { contract, acc1 } = await loadFixture(
        twoBidsEnglishAuctionFixture
      );
      expect(await contract.bids(acc1)).to.equal(400);
    });
    it("Sending bid should set proper values of highestBidder and highestBid public variables", async function () {
      const { contract, acc3 } = await loadFixture(
        twoBidsEnglishAuctionFixture
      );
      await contract.connect(acc3).bid({ value: 800 });
      expect(await contract.highestBidder()).to.equal(acc3);
      expect(await contract.highestBid()).to.equal(800);
    });
    it("An event should be emit after the correct bid has been placed", async function () {
      const { contract, acc1 } = await loadFixture(deployEnglishAuctionFixture);
      await contract.start();
      await expect(contract.connect(acc1).bid({ value: 400 }))
        .to.emit(contract, "Bid")
        .withArgs(acc1, 400);
    });
  });

  describe("Withdrawal", function () {
    it("Refunded amount must be be greater than zero", async function () {
      const { contract, acc3 } = await loadFixture(
        twoBidsEnglishAuctionFixture
      );
      await expect(contract.connect(acc3).withdraw()).to.be.revertedWith(
        "Incorrect refund amount"
      );
    });
    it("After withdrawal, the bidder's balance should be 0", async function () {
      const { contract, acc1 } = await loadFixture(
        twoBidsEnglishAuctionFixture
      );
      expect(await contract.bids(acc1)).to.equal(400);
      await contract.connect(acc1).withdraw();
      expect(await contract.bids(acc1)).to.equal(0);
    });
    it("The sender's balance should increase by the amount of the refund", async function () {
      const { contract, acc1 } = await loadFixture(
        twoBidsEnglishAuctionFixture
      );
      await expect(contract.connect(acc1).withdraw()).to.changeEtherBalance(
        acc1,
        400
      );
    });
    it("An event should be emit after the bidder has withdrawn funds", async function () {
      const { contract, acc1 } = await loadFixture(
        twoBidsEnglishAuctionFixture
      );
      await expect(contract.connect(acc1).withdraw())
        .to.emit(contract, "Withdraw")
        .withArgs(acc1, 400);
    });
  });
});

