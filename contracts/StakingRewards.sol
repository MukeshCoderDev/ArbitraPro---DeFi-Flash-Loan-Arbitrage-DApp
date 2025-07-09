// SPDX-License-Identifier: MIT
 pragma solidity ^0.8.20;
 

 import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
 import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
 import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
 import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
 import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
 import "./interfaces/ITimelockController.sol";
 import "./tokens/ArbitraProToken.sol";
 

 contract StakingRewards is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
  using SafeERC20 for IERC20;
  
  // Named constants
  uint256 public constant REWARD_DURATION = 365 days;
  uint256 public constant PRECISION = 1e18;
  
  // Events
  event Staked(address indexed user, uint256 amount);
  event Withdrawn(address indexed user, uint256 amount);
  event RewardPaid(address indexed user, uint256 reward);
  event RewardRateUpdated(uint256 newRate);
  
  // State variables
  IERC20 public stakingToken;
  uint256 public rewardRate; // Tokens per second
  uint256 public periodFinish;
  uint256 public lastUpdateTime;
  uint256 public rewardPerTokenStored;
  
  mapping(address => uint256) public userRewardPerTokenPaid;
  mapping(address => uint256) public rewards;
  mapping(address => uint256) private _balances;
  
  uint256 private _totalSupply;
 

  function initialize(
  address _owner,
  address _stakingToken
  ) public initializer {
  __Ownable_init(_owner);
  __ReentrancyGuard_init();
  __UUPSUpgradeable_init();
  _transferOwnership(_owner);
  stakingToken = IERC20(_stakingToken);
  }
 

  function totalSupply() external view returns (uint256) {
  return _totalSupply;
  }
 

  function balanceOf(address account) external view returns (uint256) {
  return _balances[account];
  }
 

  function rewardPerToken() public view returns (uint256) {
  if (_totalSupply == 0) {
  return rewardPerTokenStored;
  }
  uint256 timeElapsed = block.timestamp < periodFinish
  ? block.timestamp - lastUpdateTime
  : periodFinish - lastUpdateTime;
  return rewardPerTokenStored + (timeElapsed * rewardRate * PRECISION) / _totalSupply;
  }
 

  function earned(address account) public view returns (uint256) {
  return (_balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / PRECISION + rewards[account];
  }
 

  function stake(uint256 amount) external nonReentrant {
  require(amount > 0, "Zero amount");
  _updateReward(msg.sender);
  _totalSupply += amount;
  _balances[msg.sender] += amount;
  stakingToken.safeTransferFrom(msg.sender, address(this), amount);
  emit Staked(msg.sender, amount);
  }
 

  function unstake(uint256 amount) external nonReentrant {
  require(amount > 0, "Zero amount");
  require(amount <= _balances[msg.sender], "Insufficient balance");
  _updateReward(msg.sender);
  _totalSupply -= amount;
  _balances[msg.sender] -= amount;
  stakingToken.safeTransfer(msg.sender, amount);
  emit Withdrawn(msg.sender, amount);
  }
 

  function getReward() external nonReentrant {
  _updateReward(msg.sender);
  uint256 reward = rewards[msg.sender];
  require(reward > 0, "No rewards");
  rewards[msg.sender] = 0;
  stakingToken.safeTransfer(msg.sender, reward);
  emit RewardPaid(msg.sender, reward);
  }
 

  function setRewardRate(uint256 _rewardRate) external onlyOwner {
  // MEDIUM FIX: Fully reset reward state
  rewardPerTokenStored = rewardPerToken();
  lastUpdateTime = block.timestamp;
  periodFinish = block.timestamp + REWARD_DURATION;
  rewardRate = _rewardRate;
  emit RewardRateUpdated(_rewardRate);
  }
 

  /**
  * @notice This function would allow replenishing rewards during active period
  * @dev Currently commented out for security review - implement after audit
  * function addRewards(uint256 amount) external onlyOwner {
  * require(block.timestamp < periodFinish, "Period expired");
  * stakingToken.safeTransferFrom(msg.sender, address(this), amount);
  * uint256 remainingTime = periodFinish - block.timestamp;
  * uint256 remainingRewards = rewardRate * remainingTime;
  * rewardRate = (remainingRewards + amount) / remainingTime;
  * }
  */
 

  function _updateReward(address account) private {
  rewardPerTokenStored = rewardPerToken();
  lastUpdateTime = block.timestamp < periodFinish ? block.timestamp : periodFinish;
  
  if (account != address(0)) {
  rewards[account] = earned(account);
  userRewardPerTokenPaid[account] = rewardPerTokenStored;
  }
  }
 

  // UUPS upgrade authorization with timelock check
  function _authorizeUpgrade(address) internal override onlyOwner {
  require(
  ITimelockController(owner()).getMinDelay() >= 7 days,
  "Timelock delay too low"
  );
  }
 }
 