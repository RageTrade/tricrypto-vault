import addresses from '../fixtures/addresses';
import hre from 'hardhat';
import { BigNumber, BigNumberish } from 'ethers';
import {
  ERC20,
  ICurveStableSwap,
  ILPPriceGetter,
  ICurveGauge,
  CurveYieldStrategy,
  IQuoter,
} from '../../typechain-types';

export const unlockWhales = async () => {
  await Promise.all([
    hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [addresses.LP_TOKEN_WHALE],
    }),
    hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [addresses.USDC_WHALE],
    }),
    hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [addresses.USDT_WHALE],
    }),
    hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [addresses.WETH_WHALE],
    }),
    hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [addresses.WBTC_WHALE],
    }),
    hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [addresses.CRV_WHALE],
    }),
  ]);
};

const getReserves = async (triCrypto: ICurveStableSwap, lpOracle: ILPPriceGetter) => {
  return Promise.all([lpOracle.lp_price(), triCrypto.balances(0), triCrypto.balances(1), triCrypto.balances(2)]);
};

export const swapEth = async (
  amount: BigNumberish,
  address: string,
  weth: ERC20,
  tc: ICurveStableSwap,
  lpOracle: ILPPriceGetter,
) => {
  const signer = await hre.ethers.getSigner(address);

  const triCrypto = tc.connect(signer);
  const [initialLpTokenPrice, initialUsdtReserve, initialWbtcReserve, initialWethReserve] = await getReserves(
    triCrypto,
    lpOracle,
  );

  const [triCryptoWhale, usdtWhale, wbtcWhale, wethWhale, crvWhale] = await Promise.all([
    hre.ethers.getSigner(addresses.LP_TOKEN_WHALE),
    hre.ethers.getSigner(addresses.USDT_WHALE),
    hre.ethers.getSigner(addresses.WBTC_WHALE),
    hre.ethers.getSigner(addresses.WETH_WHALE),
    hre.ethers.getSigner(addresses.CRV_WHALE),
  ]);
  const ONE = BigNumber.from(10).pow(18);

  // console.log('BEFORE SWAP ETH : ');
  // console.log('LP TOKEN PRICE', initialLpTokenPrice, '$');
  // console.log('USDT RESERVE', initialUsdtReserve, ' USDT');
  // console.log('WBTC RESERVE', initialWbtcReserve, ' WBTC');
  // console.log('WETH RESERVE', initialWethReserve, ' WETH');

  await weth.connect(wethWhale).transfer(signer.address, ONE.mul(amount));
  await weth.connect(signer).approve(triCrypto.address, ONE.mul(amount));

  let dy = await triCrypto.connect(signer).get_dy(2, 0, ONE.mul(amount));

  await triCrypto['exchange(uint256,uint256,uint256,uint256,bool)'](2, 0, ONE.mul(amount), dy, false);

  let [finalLpTokenPrice, finalUsdtReserve, finalWbtcReserve, finalWethReserve] = await getReserves(
    triCrypto,
    lpOracle,
  );

  // console.log('AFTER SWAP ETH : ');
  // console.log('LP TOKEN PRICE', finalLpTokenPrice, '$');
  // console.log('USDT RESERVE', finalUsdtReserve, ' USDT');
  // console.log('WBTC RESERVE', finalWbtcReserve, ' WBTC');
  // console.log('WETH RESERVE', finalWethReserve, ' WETH');
};

export const swapUsdt = async (
  amount: BigNumberish,
  address: string,
  usdt: ERC20,
  tc: ICurveStableSwap,
  lpOracle: ILPPriceGetter,
) => {
  const signer = await hre.ethers.getSigner(address);
  const triCrypto = tc.connect(signer);
  const [initialLpTokenPrice, initialUsdtReserve, initialWbtcReserve, initialWethReserve] = await getReserves(
    triCrypto,
    lpOracle,
  );

  const [triCryptoWhale, usdtWhale, wbtcWhale, wethWhale, crvWhale] = await Promise.all([
    hre.ethers.getSigner(addresses.LP_TOKEN_WHALE),
    hre.ethers.getSigner(addresses.USDT_WHALE),
    hre.ethers.getSigner(addresses.WBTC_WHALE),
    hre.ethers.getSigner(addresses.WETH_WHALE),
    hre.ethers.getSigner(addresses.CRV_WHALE),
  ]);
  const POW_SIX = BigNumber.from(10).pow(6);

  // console.log('BEFORE SWAP USDT : ');
  // console.log('LP TOKEN PRICE', initialLpTokenPrice, '$');
  // console.log('USDT RESERVE', initialUsdtReserve, ' USDT');
  // console.log('WBTC RESERVE', initialWbtcReserve, ' WBTC');
  // console.log('WETH RESERVE', initialWethReserve, ' WETH');

  await usdt.connect(usdtWhale).transfer(signer.address, POW_SIX.mul(amount));
  await usdt.connect(signer).approve(triCrypto.address, POW_SIX.mul(amount));

  const dy = await triCrypto.connect(signer).get_dy(0, 2, POW_SIX.mul(amount));

  await triCrypto['exchange(uint256,uint256,uint256,uint256,bool)'](0, 2, POW_SIX.mul(amount), dy, false);

  let [finalLpTokenPrice, finalUsdtReserve, finalWbtcReserve, finalWethReserve] = await getReserves(
    triCrypto,
    lpOracle,
  );

  // console.log('AFTER SWAP USDT : ');
  // console.log('LP TOKEN PRICE', finalLpTokenPrice, '$');
  // console.log('USDT RESERVE', finalUsdtReserve, ' USDT');
  // console.log('WBTC RESERVE', finalWbtcReserve, ' WBTC');
  // console.log('WETH RESERVE', finalWethReserve, ' WETH');
};

export const accrueFees = async (
  address: string,
  gauge: ICurveGauge,
  crv: ERC20,
  usdt: ERC20,
  curveYieldStrategy: CurveYieldStrategy,
  triCrypto: ICurveStableSwap,
  quoter: IQuoter,
  lpToken: ERC20,
) => {
  const lpTokensBefore = await curveYieldStrategy.totalAssets();

  // console.log('BEFORE ACCRUING FEES : ');
  // console.log('CLAIMABLE REWARDS (100% in CRV): ', await gauge.claimable_reward(address, crv.address));
  // console.log('CRV TOKENS IN VAULT (FEES, 10% in CRV) : ', await crv.balanceOf(address));
  // console.log('LP TOKENS FROM CRV FEES (90% CRV swapped): ', lpTokensBefore);
  // console.log('PRICE PER SHARE : ', await curveYieldStrategy.previewMint(10n ** 18n));

  // await gauge.claimable_reward_write(address, addresses.CRV);

  // console.log('AFTER ACCRUING FEES : ');

  const claimable = await gauge.claimable_reward(address, crv.address);
  // console.log('CLAIMABLE REWARDS (100% in CRV): ', claimable);
  // console.log(claimable.mul(9).div(10));

  const usdtOut = await quoter.callStatic.quoteExactInput(
    '0x11cdb42b0eb46d95f990bedd4695a6e3fa034978000bb882af49447d8a07e3bd95bd0d56f35241523fbab10001f4fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    claimable.mul(9).div(10),
  );
  const lpTokenOut = await triCrypto.calc_token_amount([usdtOut, 0, 0], true);

  // console.log('CRV TOKENS IN VAULT (FEES, 10% in CRV) : ', claimable.div(10));
  // console.log('LP TOKENS FROM CRV FEES (90% CRV swapped): ', lpTokenOut);
  // console.log('PRICE PER SHARE : ', await curveYieldStrategy.previewMint(10n ** 18n));
};
