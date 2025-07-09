// SPDX-License-Identifier: MIT
 pragma solidity ^0.8.20;
 

 import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
 import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
 import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
 import "@openzeppelin/contracts/access/Ownable.sol";
 

 contract ArbitraProToken is ERC20, ERC20Permit, ERC20Votes, Ownable {
  uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18;
  
  constructor()
  ERC20("ArbitraPro", "ARBPRO")
  ERC20Permit("ArbitraPro")
  Ownable(msg.sender)
  {
  _mint(msg.sender, MAX_SUPPLY);
  }
 

  function mint(address to, uint256 amount) external onlyOwner {
  require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
  _mint(to, amount);
  }
 

  function _update(
  address from,
  address to,
  uint256 amount
  ) internal override(ERC20, ERC20Votes) {
  super._update(from, to, amount);
  }
 

  // Note: In OpenZeppelin v5.0.0, _mint is not virtual and we should use _update instead
 

  // Note: In OpenZeppelin v5.0.0, _burn is not virtual and we should use _update instead

  function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
    return super.nonces(owner);
  }
 }
 