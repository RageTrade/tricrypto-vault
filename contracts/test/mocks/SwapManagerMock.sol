// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity ^0.8.9;

import { SwapManager } from '../../libraries/SwapManager.sol';

import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { ICurveStableSwap } from '../../interfaces/curve/ICurveStableSwap.sol';
import { ISwapRouter } from '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';

contract SwapManagerMock {
    address internal constant usdc = 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8;
    address internal constant usdt = 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9;

    ISwapRouter internal constant uniV3Router = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);
    ICurveStableSwap internal constant tricryptoPool = ICurveStableSwap(0x960ea3e3C7FB317332d990873d354E18d7645590);

    function swapUsdcToUsdtAndAddLiquidity(uint256 usdcAmount, uint256 slippage) external {
        bytes memory path = abi.encodePacked(usdc, uint24(500), usdt);

        IERC20(usdc).approve(address(uniV3Router), type(uint256).max);
        IERC20(usdt).approve(address(tricryptoPool), type(uint256).max);

        SwapManager.swapUsdcToUsdtAndAddLiquidity(usdcAmount, slippage, path, uniV3Router, tricryptoPool);
    }

    function swapUsdtToUsdc(uint256 usdtAmount, uint256 slippage) external returns (uint256 usdcOut) {
        bytes memory path = abi.encodePacked(usdt, uint24(500), usdc);

        IERC20(usdt).approve(address(uniV3Router), type(uint256).max);

        return SwapManager.swapUsdtToUsdc(usdtAmount, slippage, path, uniV3Router);
    }
}
