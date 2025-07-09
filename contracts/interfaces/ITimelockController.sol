 // SPDX-License-Identifier: MIT
 pragma solidity ^0.8.20;
 

 interface ITimelockController {
  function getMinDelay() external view returns (uint256);
 }
 