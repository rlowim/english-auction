// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract EnglishAuction {
  string public item;
  address payable public immutable seller;
  uint public endAt;
  uint public immutable duration;
  bool public started;
  bool public ended;
  uint public highestBid;
  address public highestBidder;
  mapping(address => uint) public bids;

  event Start(string _item, uint _currentPrice, uint _endAt);
  event Bid(address _bidder, uint _bid);
  event End(address _highestBidder, uint _highestBid);
  event Withdraw(address _sender, uint _refund);

  constructor(string memory _item, uint _initialPrice, uint _duration) {
    item = _item;
    highestBid = _initialPrice;
    duration = _duration;
    seller = payable(msg.sender);
  }

  modifier onlySeller() {
    require(msg.sender == seller, "You are not a seller");
    _;
  }

  modifier hasStarted() {
    require(started, "Auction not started yet");
    _;
  }

  modifier notEnded() {
    require(block.timestamp < endAt, "Auction has ended");
    _;
  }

  function start() external onlySeller {
    require(!started, "Auction has already started!");

    started = true;
    endAt = block.timestamp + duration;

    emit Start(item, highestBid, endAt);
  }

  function bid() external payable hasStarted notEnded {
    require(msg.value > highestBid, "Not enough bid value");
    if (highestBidder != address(0)) {
      bids[highestBidder] += highestBid;
    }
    highestBid = msg.value;
    highestBidder = msg.sender;

    emit Bid(msg.sender, msg.value);
  }

  function end() external hasStarted onlySeller{
    require(!ended, "Auction already ended");
    require(block.timestamp >= endAt, "You can not stop auction yet");

    ended = true;

    if (highestBidder != address(0)) {
      seller.transfer(highestBid);
    }

    emit End(highestBidder, highestBid);
  }

  function withdraw() external {
    uint refundAmount = bids[msg.sender];
    require(refundAmount > 0, "Incorrect refund amount");

    bids[msg.sender] = 0;
    payable(msg.sender).transfer(refundAmount);
    emit Withdraw(msg.sender, refundAmount);
  }
}
