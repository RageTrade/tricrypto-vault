import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import addresses from './fixtures/addresses';
import { increaseBlockTimestamp } from './utils/vault-helpers';
import { formatEther, parseEther, parseUnits, formatUnits } from 'ethers/lib/utils';
import { ERC20, ICurveGauge, IGaugeFactory, ICurveStableSwap, ILPPriceGetter, ICurveGauge__factory, IERC20__factory } from '../typechain-types';
import { activateMainnetFork } from './utils/mainnet-fork';

describe('Update Implementation', () => {
  before(async () => {
    await activateMainnetFork({
      network: 'arbitrum-mainnet',
      blockNumber: 116800000,
    });
  });

  it('tests updating implementation', async () => {
    const crv = (await hre.ethers.getContractAt(
      '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
      addresses.CRV,
    )) as ERC20;

    const gaugeFactory = (await hre.ethers.getContractAt(
      'contracts/interfaces/curve/IGaugeFactory.sol:IGaugeFactory',
      addresses.GAUGE_FACTORY,
    )) as IGaugeFactory;

    const lpToken = (await hre.ethers.getContractAt(
      '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
      addresses.TRICRYPTO_LP_TOKEN,
    )) as ERC20;

    const lpOracle = (await hre.ethers.getContractAt(
      'contracts/interfaces/curve/ILPPriceGetter.sol:ILPPriceGetter',
      addresses.QUOTER,
    )) as ILPPriceGetter;

    const signers = await hre.ethers.getSigners();
    const newUser = signers[0];

    const owner = '0xee2a909e3382cdf45a0d391202aff3fb11956ad1';
    const timelock = '0x39b54de853d9dca48e928a273c3bb5fa0299540a';
    const keeper = '0x0C0e6d63A7933e1C2dE16E1d5E61dB1cA802BF51';
    const oldUser = '0x507c7777837b85ede1e67f5a4554ddd7e58b1f87';
    const proxyAdmin = '0xA335Dd9CeFBa34449c0A89FB4d247f395C5e3782';
    const triCryptoWhale = '0x555766f3da968ecBefa690Ffd49A2Ac02f47aa5f';

    const prevLogic = '0xaC3c6Dcbb6E15D0dDE28b41d58091bA82682042A';

    const vaultWithLogicAbi = await hre.ethers.getContractAt(
      'CurveYieldStrategy',
      '0x1d42783E7eeacae12EbC315D1D2D0E3C6230a068',
    );
    const vaultWithProxyAbi = await hre.ethers.getContractAt(
      'TransparentUpgradeableProxy',
      '0x1d42783E7eeacae12EbC315D1D2D0E3C6230a068',
    );

    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [owner],
    });

    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [timelock],
    });

    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [keeper],
    });

    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [oldUser],
    });

    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [proxyAdmin],
    });

    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [vaultWithLogicAbi.address],
    });

    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [triCryptoWhale],
    });

    const swapSimulator = { address: await vaultWithLogicAbi.swapSimulator() };
    const swapManager = { address: '0x88f24fC145F9209630c66cf3D302e3b5a66f772C' };

    const logic = { address: '0xd4598dcb1d5f905a24bbcd9cf61e4f7ab7161e10' };

    const vaultLogic = await (
      await hre.ethers.getContractFactory('CurveYieldStrategy', {
        libraries: {
          ['contracts/libraries/SwapManager.sol:SwapManager']: swapManager.address,
          ['contracts/libraries/Logic.sol:Logic']: logic.address,
        },
      })
    ).deploy(swapSimulator.address);

    const timelockSigner = await hre.ethers.getSigner(timelock);
    const keeperSigner = await hre.ethers.getSigner(keeper);
    const oldUserSigner = await hre.ethers.getSigner(oldUser);
    const proxyAdminSigner = await hre.ethers.getSigner(proxyAdmin);
    const triCryptoWhaleSigner = await hre.ethers.getSigner(triCryptoWhale);

    const rageClearingHouse = await ethers.getContractAt('ClearingHouse', await vaultWithLogicAbi.rageClearingHouse());
    const gauge = ICurveGauge__factory.connect(addresses.NEW_GAUGE, hre.ethers.provider)
    const usdc = IERC20__factory.connect(addresses.USDC, hre.ethers.provider)

    console.log("TOTAL SUPPLY BEFORE:", formatEther(await vaultWithLogicAbi.totalSupply()))
    console.log("TOTAL ASSETS BEFORE:", formatEther(await vaultWithLogicAbi.totalAssets()))
    console.log("OUTSTANDING PNL BEFORE:", formatUnits(await rageClearingHouse.getAccountNetProfit(0), 6))
    console.log("TRICRYPTO BAL IN GAUGE BEFORE:", formatUnits(await gauge.balanceOf(vaultWithLogicAbi.address)))
    console.log("USDC BAL IN 80-20 BEFORE:", formatUnits(await usdc.balanceOf(vaultWithLogicAbi.address), 6))


    // ADDED UPDATE BASE PARAMS AND REBALANCE
    console.log('Update base params');

    await vaultWithLogicAbi
      .connect(timelockSigner)
      .updateBaseParams(
        await vaultWithLogicAbi.depositCap(),
        await vaultWithLogicAbi.keeper(),
        0,
        await vaultWithLogicAbi.rebalancePriceThresholdBps(),
      );

    console.log('Rebalancing');
    await vaultWithLogicAbi.connect(keeperSigner).rebalance();

    console.log('Rebalanced');
    await increaseBlockTimestamp(10);

    const prevState = await Promise.all([
      vaultWithProxyAbi.connect(proxyAdminSigner).callStatic.admin(),
      vaultWithLogicAbi.owner(),
      vaultWithLogicAbi.keeper(),
      vaultWithLogicAbi.name(),
      vaultWithLogicAbi.symbol(),
      vaultWithLogicAbi.asset(),
      // vaultWithLogicAbi.getVaultMarketValue(),
      vaultWithLogicAbi.getPriceX128(),
      vaultWithLogicAbi.totalSupply(),
      vaultWithLogicAbi.totalAssets(),
      vaultWithLogicAbi.getMarketValue(parseEther('1')),
      vaultWithLogicAbi.baseTickUpper(),
      vaultWithLogicAbi.baseTickLower(),
      vaultWithLogicAbi.baseLiquidity(),
      vaultWithLogicAbi.rageVPool(),
      vaultWithLogicAbi.rageAccountNo(),
      vaultWithLogicAbi.rageClearingHouse(),
      vaultWithLogicAbi.ethPoolId(),
      vaultWithLogicAbi.swapSimulator(),
      vaultWithLogicAbi.isReset(),
      vaultWithLogicAbi.isValidRebalance(await vaultWithLogicAbi.getVaultMarketValue()),
      vaultWithLogicAbi.lastRebalanceTS(),
      vaultWithLogicAbi.closePositionSlippageSqrtToleranceBps(),
      vaultWithLogicAbi.minNotionalPositionToCloseThreshold(),
      lpOracle.lp_price(),
      lpToken.balanceOf(vaultWithLogicAbi.address),
      vaultWithLogicAbi.balanceOf(oldUser),
      vaultWithLogicAbi.convertToAssets(await vaultWithLogicAbi.balanceOf(oldUser)),
    ]);

    const prevImpl = await vaultWithProxyAbi.connect(proxyAdminSigner).callStatic.implementation();

    await vaultWithProxyAbi.connect(proxyAdminSigner).upgradeTo(vaultLogic.address);
    console.log('Upgraded');

    const postState = await Promise.all([
      vaultWithProxyAbi.connect(proxyAdminSigner).callStatic.admin(),
      vaultWithLogicAbi.owner(),
      vaultWithLogicAbi.keeper(),
      vaultWithLogicAbi.name(),
      vaultWithLogicAbi.symbol(),
      vaultWithLogicAbi.asset(),
      // vaultWithLogicAbi.getVaultMarketValue(),
      vaultWithLogicAbi.getPriceX128(),
      vaultWithLogicAbi.totalSupply(),
      vaultWithLogicAbi.totalAssets(),
      vaultWithLogicAbi.getMarketValue(parseEther('1')),
      vaultWithLogicAbi.baseTickUpper(),
      vaultWithLogicAbi.baseTickLower(),
      vaultWithLogicAbi.baseLiquidity(),
      vaultWithLogicAbi.rageVPool(),
      vaultWithLogicAbi.rageAccountNo(),
      vaultWithLogicAbi.rageClearingHouse(),
      vaultWithLogicAbi.ethPoolId(),
      vaultWithLogicAbi.swapSimulator(),
      vaultWithLogicAbi.isReset(),
      vaultWithLogicAbi.isValidRebalance(await vaultWithLogicAbi.getVaultMarketValue()),
      vaultWithLogicAbi.lastRebalanceTS(),
      vaultWithLogicAbi.closePositionSlippageSqrtToleranceBps(),
      vaultWithLogicAbi.minNotionalPositionToCloseThreshold(),
      lpOracle.lp_price(),
      lpToken.balanceOf(vaultWithLogicAbi.address),
      vaultWithLogicAbi.balanceOf(oldUser),
      vaultWithLogicAbi.convertToAssets(await vaultWithLogicAbi.balanceOf(oldUser)),
    ]);

    const postImpl = await vaultWithProxyAbi.connect(proxyAdminSigner).callStatic.implementation();

    expect(prevState).to.deep.eq(postState);
    expect(prevImpl).to.eq(prevLogic);
    expect(postImpl).to.eq(vaultLogic.address);

    console.log('Paused clearing house');
    await rageClearingHouse.connect(timelockSigner).pause(1);

    console.log("TOTAL SUPPLY AFTER:", formatEther(await vaultWithLogicAbi.totalSupply()))
    console.log("TOTAL ASSETS AFTER:", formatEther(await vaultWithLogicAbi.totalAssets()))
    console.log("OUTSTANDING PNL AFTER:", formatUnits(await rageClearingHouse.getAccountNetProfit(0), 6))
    console.log("TRICRYPTO BAL IN GAUGE AFTER:", formatUnits(await gauge.balanceOf(vaultWithLogicAbi.address)))
    console.log("USDC BAL IN 80-20 AFTER:", formatUnits(await usdc.balanceOf(vaultWithLogicAbi.address), 6))

    // old user is able to withdraw (& withdraw max)
    console.log('old user withdraw');
    await vaultWithLogicAbi
      .connect(oldUserSigner)
      .redeem(await vaultWithLogicAbi.balanceOf(oldUserSigner.address), oldUserSigner.address, oldUserSigner.address);
    expect(await vaultWithLogicAbi.balanceOf(oldUser)).to.eq(0);

    // old user is able to deposit again
    console.log('old user deposit');
    await vaultWithLogicAbi.connect(oldUserSigner).deposit(parseEther('1'), oldUserSigner.address);
    expect(await vaultWithLogicAbi.balanceOf(oldUser)).to.eq(await vaultWithLogicAbi.convertToShares(parseEther('1')));

    // new user is able to deposit
    console.log('new user deposit');
    await lpToken.connect(triCryptoWhaleSigner).transfer(newUser.address, parseEther('1'));
    await lpToken.connect(newUser).approve(vaultWithLogicAbi.address, ethers.constants.MaxUint256);
    await vaultWithLogicAbi.connect(newUser).deposit(parseEther('1'), newUser.address);
    expect(await vaultWithLogicAbi.balanceOf(newUser.address)).to.eq(await vaultWithLogicAbi.convertToShares(parseEther('1')));
  });
});
