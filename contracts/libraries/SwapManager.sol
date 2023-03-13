// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity ^0.8.9;

import { ISwapRouter } from '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import { ICurveStableSwap } from '../interfaces/curve/ICurveStableSwap.sol';

import { AggregatorV3Interface } from '@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol';

/* solhint-disable not-rely-on-time */

library SwapManager {
    error CYS_NEGATIVE_CRV_PRICE();
    error CYS_NEGATIVE_USDC_PRICE();
    error CYS_NEGATIVE_USDT_PRICE();

    uint256 internal constant MAX_BPS = 10_000;
    AggregatorV3Interface internal constant USDC_ORACLE =
        AggregatorV3Interface(0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3);
    AggregatorV3Interface internal constant USDT_ORACLE =
        AggregatorV3Interface(0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7);

    function _getCrvPrice(AggregatorV3Interface crvOracle) internal view returns (uint256) {
        (, int256 answer, , , ) = crvOracle.latestRoundData();
        if (answer < 0) revert CYS_NEGATIVE_CRV_PRICE();
        return (uint256(answer));
    }

    function _getUsdcPrice() internal view returns (uint256) {
        (, int256 answer, , , ) = USDC_ORACLE.latestRoundData();
        if (answer < 0) revert CYS_NEGATIVE_USDC_PRICE();
        return (uint256(answer));
    }

    function _getUsdtPrice() internal view returns (uint256) {
        (, int256 answer, , , ) = USDT_ORACLE.latestRoundData();
        if (answer < 0) revert CYS_NEGATIVE_USDT_PRICE();
        return (uint256(answer));
    }

    function swapUsdcToUsdtAndAddLiquidity(
        uint256 usdcAmount,
        uint256 slippage,
        bytes memory path,
        ISwapRouter uniV3Router,
        ICurveStableSwap triCrypto
    ) external {
        uint256 minUsdtOut = (usdcAmount * (MAX_BPS - slippage) * _getUsdcPrice()) / MAX_BPS / _getUsdtPrice();

        ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
            path: path,
            amountIn: usdcAmount,
            amountOutMinimum: minUsdtOut,
            recipient: address(this),
            deadline: block.timestamp
        });

        uint256 usdtOut = uniV3Router.exactInput(params);

        // USDT, WBTC, WETH
        uint256[3] memory amounts = [usdtOut, uint256(0), uint256(0)];
        triCrypto.add_liquidity(amounts, 0);
    }

    function swapUsdtToUsdc(
        uint256 usdtAmount,
        uint256 slippage,
        bytes memory path,
        ISwapRouter uniV3Router
    ) external returns (uint256 usdcOut) {
        uint256 minUsdcOut = (usdtAmount * (MAX_BPS - slippage) * _getUsdtPrice()) / MAX_BPS / _getUsdcPrice();

        ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
            path: path,
            amountIn: usdtAmount,
            amountOutMinimum: minUsdcOut,
            recipient: address(this),
            deadline: block.timestamp
        });

        usdcOut = uniV3Router.exactInput(params);
    }

    function swapCrvToUsdtAndAddLiquidity(
        uint256 crvAmount,
        uint256 crvSwapSlippageTolerance,
        AggregatorV3Interface crvOracle,
        bytes memory path,
        ISwapRouter uniV3Router,
        ICurveStableSwap triCrypto
    ) external returns (uint256 usdtOut) {
        uint256 minOut = (_getCrvPrice(crvOracle) * crvAmount * (MAX_BPS - crvSwapSlippageTolerance)) / MAX_BPS;
        // should not underflow because crvAmount > crv swap threshold
        minOut = ((minOut * (10**6)) / 10**18) / 10**8;

        ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
            path: path,
            amountIn: crvAmount,
            amountOutMinimum: minOut,
            recipient: address(this),
            deadline: block.timestamp
        });

        usdtOut = uniV3Router.exactInput(params);

        uint256[3] memory amounts = [usdtOut, uint256(0), uint256(0)];
        triCrypto.add_liquidity(amounts, 0);
    }
}
