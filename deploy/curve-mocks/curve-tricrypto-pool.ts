import {
  ERC20PresetMinterPauser__factory,
  IUniswapV3Pool__factory,
  priceToSqrtPriceX96,
  priceToTick,
} from '@ragetrade/sdk';

import { BigNumber, ethers } from 'ethers';
import { parseEther, parseUnits } from 'ethers/lib/utils';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { ICurveStableSwap__factory } from '../../typechain-types';
import { getNetworkInfo } from '../network-info';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {
    deployments: { save, deploy, get, read, execute },
    getNamedAccounts,
  } = hre;

  const { deployer } = await getNamedAccounts();

  const { CURVE_TRICRYPTO_POOL, ETH_USD_ORACLE, BTC_USD_ORACLE, USDT_USD_ORACLE } = getNetworkInfo();

  if (CURVE_TRICRYPTO_POOL === undefined) {
    // deploying mock
    const CurveTriCryptoPoolDeployment = await deploy('CurveTriCryptoPool', {
      contract: 'StableSwapMock',
      from: deployer,
      log: true,
      args: [
        (await get('CurveTriCryptoLpToken')).address,
        [(await get('USDT')).address, (await get('WBTC')).address, (await get('WETH')).address],
        [USDT_USD_ORACLE, BTC_USD_ORACLE, ETH_USD_ORACLE],
      ],
    });

    if (CurveTriCryptoPoolDeployment.newlyDeployed) {
      await execute(
        'WETH',
        { from: deployer, log: true },
        'approve',
        CurveTriCryptoPoolDeployment.address,
        ethers.constants.MaxUint256,
      );
      await execute(
        'WBTC',
        { from: deployer, log: true },
        'approve',
        CurveTriCryptoPoolDeployment.address,
        ethers.constants.MaxUint256,
      );

      await execute(
        'USDT',
        { from: deployer, log: true },
        'approve',
        CurveTriCryptoPoolDeployment.address,
        ethers.constants.MaxUint256,
      );

      const MINTER_ROLE = await read('CurveTriCryptoLpToken', 'MINTER_ROLE');
      await execute(
        'CurveTriCryptoLpToken',
        { from: deployer, log: true },
        'grantRole',
        MINTER_ROLE,
        CurveTriCryptoPoolDeployment.address,
      );

      await execute(
        'CurveTriCryptoPool',
        { from: deployer, log: true, gasLimit: 20_000_000 },
        'add_liquidity',
        [parseUnits('1000000000', 6), parseUnits('20000', 8), parseEther('330000')],
        0,
      );
    }
  } else {
    await save('CurveTriCryptoPool', { abi: ICurveStableSwap__factory.abi, address: CURVE_TRICRYPTO_POOL });
  }
};

export default func;

func.tags = ['CurveTriCryptoPool', 'CurveMocks'];
func.dependencies = ['CurveTriCryptoLpToken', 'WETH', 'WBTC', 'USDT'];
