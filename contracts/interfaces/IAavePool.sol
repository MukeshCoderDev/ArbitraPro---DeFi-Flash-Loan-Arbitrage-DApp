 // SPDX-License-Identifier: MIT
 pragma solidity ^0.8.20;
 

 interface IAavePool {
  function flashLoan(
  address receiver,
  address[] calldata assets,
  uint256[] calldata amounts,
  uint256[] calldata modes,
  address onBehalfOf,
  bytes calldata params,
  uint16 referralCode
  ) external;
 }
 