// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IUniswapV2Router02 {
    function getAmountsOut(uint256 amountIn, address[] memory path) external view returns (uint256[] memory amounts);
}

interface IUniswapV2Pair {
    function getReserves() external view returns (uint256 reserve0, uint256 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

contract Payment is Ownable(msg.sender) {
	address public paymentToken;
	address public treasuryWallet;
    address public uniswapV2Router = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public usdtToken;
    uint256 constant CREDIT_PRICE = 50e6; // 50 USDT for each credit


	mapping(address => uint256) private credits;

	event BoughtCredits(address indexed user, uint256 amount);

	constructor(address _paymentToken, address _usdtToken) {
		paymentToken = _paymentToken;
        usdtToken = _usdtToken;
	}

	function payProposal(uint256 amount) external {
		require(amount > 0, "Cannot purchase 0");
        uint256 totalUsdtValue = amount * CREDIT_PRICE;

        address[] memory path = new address[](2);
        path[0] = paymentToken;
        path[1] = usdtToken;

        uint256[] memory amounts = IUniswapV2Router02(uniswapV2Router).getAmountsOut(totalUsdtValue, path);
        uint256 requiredCAGA = amounts[0] * 1e12; // Conversion to 18 decimals from USDT

		IERC20 token = IERC20(paymentToken);
		require(token.transferFrom(msg.sender, treasuryWallet, requiredCAGA), "Transfer failed!");

		credits[msg.sender] += amount;

		emit BoughtCredits(msg.sender, amount);
	}

	function getAvailableCredits(address walletAddress) external view returns (uint256) {
		return credits[walletAddress];
	}

	function getRates(uint256 amount) external view returns (uint256) {
        uint256 totalUsdtValue = amount * CREDIT_PRICE;

        address[] memory path = new address[](2);
        path[0] = paymentToken;
        path[1] = usdtToken;

        uint256[] memory amounts = IUniswapV2Router02(uniswapV2Router).getAmountsOut(totalUsdtValue, path);
        return amounts[0] * 1e12; // Conversion to 18 decimals from USDT
	}

	function updateERC20Address(address newAddress) external onlyOwner {
		paymentToken = newAddress;
	}

	function updateTreasuryWallet(address newWallet) external onlyOwner {
		treasuryWallet = newWallet;
	}

    function setUniswapRouter(address _uniswapV2Router) external onlyOwner {
        uniswapV2Router = _uniswapV2Router;
    }
}
