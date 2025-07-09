// SPDX-License-Identifier: MIT
 pragma solidity ^0.8.20;
 

 import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
 import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
 import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
 import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
 import "./interfaces/IUniswapV2Router.sol";
 import "./interfaces/ISushiswapRouter.sol";
 import "./interfaces/ITimelockController.sol";
 

 contract SwapRouter is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
  // Named constants
  uint256 public constant BPS_DENOMINATOR = 10_000;
  uint256 public constant DEFAULT_DEADLINE = 300; // 5 minutes
  uint256 public constant MAX_PATH_LENGTH = 6;
  uint256 public constant MAX_FEE = 500; // 5%
  
  // Events
  event ProtocolFeeUpdated(uint256 newFee);
  event TreasuryUpdated(address newTreasury);
  event SwapExecuted(
  address indexed user,
  address[] path,
  uint256 amountIn,
  uint256 amountOut,
  uint256 protocolFee
  );
  
  // State variables
  address public treasury;
  uint256 public protocolFee; // Basis points (100 = 1%)
  IUniswapV2Router public uniswapRouter;
  ISushiswapRouter public sushiswapRouter;
  
  function initialize(
  address _owner,
  address _treasury,
  uint256 _protocolFee,
  address _uniswapRouter,
  address _sushiswapRouter
  ) public initializer {
  __Ownable_init(_owner);
  __ReentrancyGuard_init();
  __UUPSUpgradeable_init();
  _transferOwnership(_owner);
  treasury = _treasury;
  protocolFee = _protocolFee;
  uniswapRouter = IUniswapV2Router(_uniswapRouter);
  sushiswapRouter = ISushiswapRouter(_sushiswapRouter);
  }
 

  /// @notice Performs token swap with best available rate
  function swapExactTokensForTokens(
  uint256 amountIn,
  uint256 amountOutMin,
  address[] calldata path,
  address to,
  uint256 deadline
  ) external nonReentrant {
  require(path.length >= 2 && path.length <= MAX_PATH_LENGTH, "Invalid path");
  require(deadline >= block.timestamp, "Expired deadline");
  
  IERC20 srcToken = IERC20(path[0]);
  address outputToken = path[path.length - 1];
  srcToken.transferFrom(msg.sender, address(this), amountIn);
  
  // Cache storage variables
  uint256 _protocolFee = protocolFee;
  IUniswapV2Router _uniswapRouter = uniswapRouter;
  ISushiswapRouter _sushiswapRouter = sushiswapRouter;
  
  // Record balance before swap
  uint256 balanceBefore = IERC20(outputToken).balanceOf(address(this));
  
  // Calculate best route
  (uint256 amountOut, address dexRouter) = _getBestRoute(amountIn, path, _uniswapRouter, _sushiswapRouter);
  require(amountOut >= amountOutMin, "Insufficient output");
  
  // Implement approve-and-revoke pattern
  srcToken.approve(dexRouter, 0);
  srcToken.approve(dexRouter, amountIn);
  
  // Execute swap
  if (dexRouter == address(_uniswapRouter)) {
  _uniswapRouter.swapExactTokensForTokens(
  amountIn,
  amountOut,
  path,
  address(this),
  deadline
  );
  } else {
  _sushiswapRouter.swapExactTokensForTokens(
  amountIn,
  amountOut,
  path,
  address(this),
  deadline
  );
  }
  
  // Revoke approval
  srcToken.approve(dexRouter, 0);
  
  // Calculate actual output and fees
  uint256 actualOutput = IERC20(outputToken).balanceOf(address(this)) - balanceBefore;
  uint256 feeAmount = (actualOutput * _protocolFee) / BPS_DENOMINATOR;
  uint256 amountOutAfterFee = actualOutput - feeAmount;
  
  // Transfer tokens
  IERC20(outputToken).transfer(to, amountOutAfterFee);
  IERC20(outputToken).transfer(treasury, feeAmount);
  
  emit SwapExecuted(msg.sender, path, amountIn, amountOutAfterFee, feeAmount);
  }
 

  /// @notice Calculates expected output for given input
  function getAmountsOut(
  uint256 amountIn,
  address[] calldata path
  ) public view returns (uint256[] memory amounts) {
  // Cache storage variables
  IUniswapV2Router _uniswapRouter = uniswapRouter;
  ISushiswapRouter _sushiswapRouter = sushiswapRouter;
  
  uint256[] memory uniswapAmounts = _uniswapRouter.getAmountsOut(amountIn, path);
  uint256[] memory sushiswapAmounts = _sushiswapRouter.getAmountsOut(amountIn, path);
  
  return uniswapAmounts[path.length - 1] > sushiswapAmounts[path.length - 1]
  ? uniswapAmounts
  : sushiswapAmounts;
  }
 

  function _getBestRoute(
  uint256 amountIn,
  address[] calldata path,
  IUniswapV2Router _uniswapRouter,
  ISushiswapRouter _sushiswapRouter
  ) private view returns (uint256 amountOut, address router) {
  uint256 uniswapOut = _uniswapRouter.getAmountsOut(amountIn, path)[path.length - 1];
  uint256 sushiswapOut = _sushiswapRouter.getAmountsOut(amountIn, path)[path.length - 1];
  
  // Placeholder for TWAP validation
  // In production, implement TWAP checks here to prevent price manipulation
  // require(uniswapOut >= twapPrice * 99 / 100, "Price manipulation");
  // require(sushiswapOut >= twapPrice * 99 / 100, "Price manipulation");
  
  return uniswapOut > sushiswapOut
  ? (uniswapOut, address(_uniswapRouter))
  : (sushiswapOut, address(_sushiswapRouter));
  }
 

  function setProtocolFee(uint256 _protocolFee) external onlyOwner {
  require(_protocolFee <= MAX_FEE, "Fee too high");
  protocolFee = _protocolFee;
  emit ProtocolFeeUpdated(_protocolFee);
  }
 

  function setTreasury(address _treasury) external onlyOwner {
  treasury = _treasury;
  emit TreasuryUpdated(_treasury);
  }
 

  // UUPS upgrade authorization with timelock check
  function _authorizeUpgrade(address) internal override onlyOwner {
  require(
  ITimelockController(owner()).getMinDelay() >= 7 days,
  "Timelock delay too low"
  );
  }
 }
 