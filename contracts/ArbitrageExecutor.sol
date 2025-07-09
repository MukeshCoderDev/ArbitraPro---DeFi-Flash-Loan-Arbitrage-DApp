// SPDX-License-Identifier: MIT
 pragma solidity ^0.8.20;
 

 import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
 import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
 import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
 import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
 import "./interfaces/IAavePool.sol";
 import "./interfaces/ITimelockController.sol";
 import "./SwapRouter.sol";
 

 contract ArbitrageExecutor is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
  // Named constants
  uint256 public constant BPS_DENOMINATOR = 10_000;
  uint256 public constant MAX_PATH_LENGTH = 6;
  uint256 public constant MAX_SLIPPAGE = 500; // 5%
  
  // Events
  event ArbitrageExecuted(
  address indexed executor,
  address loanToken,
  uint256 loanAmount,
  uint256 profit
  );
  event MaxSlippageBpsUpdated(uint256 newSlippage);
  
  // State variables
  IAavePool public aavePool;
  SwapRouter public swapRouter;
  address public treasury;
  uint256 public maxSlippageBps; // Basis points
  
  function initialize(
  address _owner,
  address _aavePool,
  address _swapRouter,
  address _treasury
  ) public initializer {
  __Ownable_init(_owner);
  __ReentrancyGuard_init();
  __UUPSUpgradeable_init();
  _transferOwnership(_owner);
  aavePool = IAavePool(_aavePool);
  swapRouter = SwapRouter(_swapRouter);
  treasury = _treasury;
  maxSlippageBps = 100; // Default 1% slippage
  }
 

  /// @notice Initiates flash loan for arbitrage
  function executeArbitrage(
  address loanProvider,
  address loanToken,
  uint256 loanAmount,
  bytes calldata tradeData
  ) external onlyOwner nonReentrant {
  require(loanProvider == address(aavePool), "Invalid loan provider");
  
  address[] memory assets = new address[](1);
  assets[0] = loanToken;
  uint256[] memory amounts = new uint256[](1);
  amounts[0] = loanAmount;
  
  aavePool.flashLoan(
  address(this),
  assets,
  amounts,
  new uint256[](1),
  address(this),
  tradeData,
  0
  );
  }
 

  /// @notice Aave flash loan callback
  function executeOperation(
  address[] calldata assets,
  uint256[] calldata amounts,
  uint256[] calldata premiums,
  address initiator,
  bytes calldata params
  ) external returns (bool) {
  require(msg.sender == address(aavePool), "Unauthorized");
  require(initiator == address(this), "Invalid initiator");
  
  // Decode and validate trade data
  (address[] memory path, uint256 minProfit) = abi.decode(params, (address[], uint256));
  require(path.length >= 2 && path.length <= MAX_PATH_LENGTH, "Invalid path");
  
  // Calculate slippage protection
  uint256 amountIn = amounts[0];
  uint256 amountOutMin = amountIn * (BPS_DENOMINATOR - maxSlippageBps) / BPS_DENOMINATOR;
  
  // Execute arbitrage
  IERC20(assets[0]).approve(address(swapRouter), amountIn);
  swapRouter.swapExactTokensForTokens(
  amountIn,
  amountOutMin,
  path,
  address(this),
  block.timestamp + 300
  );
  
  // Calculate obligations
  uint256 amountOwed = amounts[0] + premiums[0];
  uint256 finalBalance = IERC20(assets[0]).balanceOf(address(this));
  require(finalBalance >= amountOwed, "Insufficient repayment");
  
  // CRITICAL FIX: Repay loan before profit distribution
  IERC20(assets[0]).transfer(address(aavePool), amountOwed);
  
  // Transfer profit
  uint256 profit = finalBalance - amountOwed;
  require(profit >= minProfit, "Insufficient profit");
  IERC20(assets[0]).transfer(treasury, profit);
  
  emit ArbitrageExecuted(owner(), assets[0], amounts[0], profit);
  return true;
  }
 

  function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
  require(_maxSlippageBps <= MAX_SLIPPAGE, "Slippage too high");
  maxSlippageBps = _maxSlippageBps;
  emit MaxSlippageBpsUpdated(_maxSlippageBps);
  }
 

  // UUPS upgrade authorization with timelock check
  function _authorizeUpgrade(address) internal override onlyOwner {
  require(
  ITimelockController(owner()).getMinDelay() >= 7 days,
  "Timelock delay too low"
  );
  }
 }
 