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

import {
  ICurveStableSwap__factory,
  NonfungiblePositionManager__factory,
  UniswapV3Factory__factory,
} from '../typechain-types';
import { getNetworkInfo, UNISWAP_V3_FACTORY_ADDRESS } from './network-info';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {
    deployments: { save, deploy, get, read, execute },
    getNamedAccounts,
  } = hre;

  const { deployer } = await getNamedAccounts();

  const { CURVE_TRICRYPTO_POOL, ETH_USD_ORACLE, BTC_USD_ORACLE, USDT_USD_ORACLE, RAGE_SETTLEMENT_TOKEN_ADDRESS } =
    getNetworkInfo(hre.network.config.chainId);

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
        { from: deployer },
        'approve',
        CurveTriCryptoPoolDeployment.address,
        ethers.constants.MaxUint256,
      );
      await execute(
        'WBTC',
        { from: deployer },
        'approve',
        CurveTriCryptoPoolDeployment.address,
        ethers.constants.MaxUint256,
      );

      await execute(
        'USDT',
        { from: deployer },
        'approve',
        CurveTriCryptoPoolDeployment.address,
        ethers.constants.MaxUint256,
      );

      const MINTER_ROLE = await read('CurveTriCryptoLpToken', 'MINTER_ROLE');
      await execute(
        'CurveTriCryptoLpToken',
        { from: deployer },
        'grantRole',
        MINTER_ROLE,
        CurveTriCryptoPoolDeployment.address,
      );

      await execute(
        'CurveTriCryptoPool',
        { from: deployer, gasLimit: 20_000_000 },
        'add_liquidity',
        [parseUnits('1000000000', 6), parseUnits('20000', 8), parseEther('330000')],
        0,
      );

      const uniswapFactory = UniswapV3Factory__factory.connect(
        UNISWAP_V3_FACTORY_ADDRESS,
        await hre.ethers.getSigner(deployer),
      );

      const WETH = (await get('WETH')).address;
      const WBTC = (await get('WBTC')).address;
      const USDT = (await get('USDT')).address;
      const USDC = RAGE_SETTLEMENT_TOKEN_ADDRESS ?? (await get('SettlementToken')).address;
      const CRV = (await get('CurveToken')).address;
      const CRV3CRYPTO = (await get('CurveTriCryptoLpToken')).address;

      const tokens = [
        { token: WETH, price: 2500 },
        { token: WBTC, price: 30000 },
        { token: USDT, price: 1 },
        { token: USDC, price: 1 },
        { token: CRV, price: 10 },
        { token: CRV3CRYPTO, price: 10 },
      ];

      for (let i = 0; i < tokens.length; i++) {
        for (let j = 0; j < tokens.length; j++) {
          if (i !== j) {
            await ensurePool(
              tokens[i].token,
              tokens[j].token,
              10_000_000 / tokens[i].price,
              10_000_000 / tokens[j].price,
            );
          }
        }
      }

      // await uniswapFactory.createPool((await get('USDT')).address, (await get('WETH')).address, 500);
      async function ensurePool(token0Address: string, token1Address: string, amount0: number, amount1: number) {
        if (BigNumber.from(token0Address).gt(token1Address)) {
          [token0Address, token1Address] = [token1Address, token0Address];
        }
        const token0 = ERC20PresetMinterPauser__factory.connect(token0Address, uniswapFactory.signer);
        const token1 = ERC20PresetMinterPauser__factory.connect(token1Address, uniswapFactory.signer);

        try {
          await wait(uniswapFactory.createPool(token0.address, token1.address, 500));

          const poolAddress = await uniswapFactory.getPool(token0.address, token1.address, 500);
          console.log(
            `Add liq to UniswapV3Pool ${await token0.symbol()}-${await token1.symbol()}, poolAddress: ${poolAddress}`,
          );

          const pool = IUniswapV3Pool__factory.connect(poolAddress, uniswapFactory.signer);
          const decimals0 = await token0.decimals();
          const decimals1 = await token1.decimals();

          await wait(pool.initialize(await priceToSqrtPriceX96(amount1 / amount0, decimals0, decimals1)));

          const tickLower = await priceToTick((amount1 / amount0) * 1.1, decimals0, decimals1, true);
          const tickUpper = await priceToTick((amount1 / amount0) * 0.9, decimals0, decimals1, true);
          const nfpm = NonfungiblePositionManager__factory.connect(
            '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
            uniswapFactory.signer,
          );

          await wait(
            token0.mint(await uniswapFactory.signer.getAddress(), parseUnits(amount0.toFixed(decimals0), decimals0)),
          );
          await wait(
            token1.mint(await uniswapFactory.signer.getAddress(), parseUnits(amount1.toFixed(decimals1), decimals1)),
          );
          await wait(token0.approve(nfpm.address, ethers.constants.MaxUint256));
          await wait(token1.approve(nfpm.address, ethers.constants.MaxUint256));

          await wait(
            nfpm.mint({
              token0: token0.address,
              token1: token1.address,
              fee: 500,
              tickLower: Math.min(tickLower, tickUpper),
              tickUpper: Math.max(tickLower, tickUpper),
              amount0Desired: parseUnits(amount0.toFixed(decimals0), decimals0),
              amount1Desired: parseUnits(amount1.toFixed(decimals1), decimals1),
              amount0Min: 0,
              amount1Min: 0,
              recipient: await uniswapFactory.signer.getAddress(),
              deadline: Date.now(), // very future date
            }),
          );
        } catch {}
        async function wait(txPromise: Promise<ethers.ContractTransaction>) {
          return (await txPromise).wait();
        }
      }
    }
  } else {
    await save('CurveTriCryptoPool', { abi: ICurveStableSwap__factory.abi, address: CURVE_TRICRYPTO_POOL });
  }
};

export default func;

func.tags = ['CurveTriCryptoPool'];
func.dependencies = ['SettlementToken', 'CurveToken', 'CurveTriCryptoLpToken', 'WETH', 'WBTC', 'USDT'];