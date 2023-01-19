import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import addresses from './fixtures/addresses';
import { increaseBlockTimestamp } from './utils/vault-helpers';
import { formatEther, parseEther, parseUnits } from 'ethers/lib/utils';
import { ERC20, ICurveGauge, IGaugeFactory, ICurveStableSwap, ILPPriceGetter } from '../typechain-types';
import { activateMainnetFork } from './utils/mainnet-fork';

describe.skip('Update Implementation', () => {
  before(async () => {
    await activateMainnetFork({
      network: 'arbitrum-mainnet',
      blockNumber: 22681512,
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
    const triCryptoWhale = '0xAc27D1D01d1C2E29c8B567860c3f38123A4A9FEA';

    const prevLogic = '0x96365da944537d027eCC9905f6b4237C093aE568';

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

    const swapSimulator = await (await hre.ethers.getContractFactory('SwapSimulator')).deploy();

    const swapManager = await (await hre.ethers.getContractFactory('SwapManager')).deploy();

    const logic = await (
      await hre.ethers.getContractFactory('Logic', {
        libraries: {
          ['contracts/libraries/SwapManager.sol:SwapManager']: swapManager.address,
        },
      })
    ).deploy();

    const vaultLogic = await (
      await hre.ethers.getContractFactory('CurveYieldStrategy', {
        libraries: {
          ['contracts/libraries/SwapManager.sol:SwapManager']: swapManager.address,
          ['contracts/libraries/Logic.sol:Logic']: logic.address,
        },
      })
    ).deploy(swapSimulator.address);

    const ownerSigner = await hre.ethers.getSigner(owner);
    const timelockSigner = await hre.ethers.getSigner(owner);
    const keeperSigner = await hre.ethers.getSigner(keeper);
    const oldUserSigner = await hre.ethers.getSigner(oldUser);
    const proxyAdminSigner = await hre.ethers.getSigner(proxyAdmin);
    const triCryptoWhaleSigner = await hre.ethers.getSigner(triCryptoWhale);
    const vaultSigner = await hre.ethers.getSigner(vaultWithLogicAbi.address);

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
      // vaultWithLogicAbi.swapSimulator(),
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

    const swapSimulatorSlot = 153;
    const slot153before = await hre.ethers.provider.getStorageAt(vaultWithProxyAbi.address, swapSimulatorSlot);

    //
    //  UPGRADE TX BELOW
    //
    await vaultWithProxyAbi.connect(proxyAdminSigner).upgradeTo(vaultLogic.address);
    //
    //  UPGRADE TX ABOVE
    //
    const slot153After = await hre.ethers.provider.getStorageAt(vaultWithProxyAbi.address, swapSimulatorSlot);

    await vaultWithLogicAbi.connect(ownerSigner).updateCurveParams(
      1000, // feeBps
      100, // stablecoinSlippage
      parseUnits('2', 18), // crvHarvestThreshold
      500, // crvSlippageTolerance
      addresses.NEW_GAUGE, // gauge
      '0xaebDA2c976cfd1eE1977Eac079B4382acb849325', // networkInfo.CURVE_USD_ORACLE,
    );

    await vaultWithLogicAbi.connect(ownerSigner).grantAllowances();
    await vaultWithLogicAbi.connect(ownerSigner).migrate();

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
      // vaultWithLogicAbi.swapSimulator(),
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
    // new swap simulator address
    expect(await vaultWithLogicAbi.swapSimulator()).to.eq(swapSimulator.address);
    expect(slot153After).to.eq(slot153before);

    // old user is able to withdraw (& withdraw max)
    await vaultWithLogicAbi
      .connect(oldUserSigner)
      .redeem(await vaultWithLogicAbi.balanceOf(oldUserSigner.address), oldUserSigner.address, oldUserSigner.address);
    expect(await vaultWithLogicAbi.balanceOf(oldUser)).to.eq(0);

    // old user is able to deposit again
    await vaultWithLogicAbi.connect(oldUserSigner).deposit(parseEther('1'), oldUserSigner.address);
    expect(await vaultWithLogicAbi.balanceOf(oldUser)).to.eq(await vaultWithLogicAbi.convertToShares(parseEther('1')));

    // new user is able to deposit
    await lpToken.connect(triCryptoWhaleSigner).transfer(newUser.address, parseEther('1'));
    await lpToken.connect(newUser).approve(vaultWithLogicAbi.address, ethers.constants.MaxUint256);

    await increaseBlockTimestamp(3_600 * 24);
    await vaultWithLogicAbi.connect(keeperSigner).rebalance();
    await vaultWithLogicAbi.connect(ownerSigner).withdrawFees(ownerSigner.address);

    const crvBal = await crv.balanceOf(ownerSigner.address);
    expect(crvBal).to.gt(0);

    const tx1 = vaultWithLogicAbi.connect(ownerSigner).updateBaseParams(
      parseEther('1055'),
      '0xe1829BaD81E9146E18f28E28691D930c052483bA', //networkInfo.KEEPER_ADDRESS,
      86400, // rebalanceTimeThreshold
      500, // rebalancePriceThresholdBps
    );
    await expect(tx1).to.emit(vaultWithLogicAbi, 'BaseParamsUpdated');

    const tx2 = await vaultWithLogicAbi.connect(ownerSigner).updateCurveParams(
      1000, // feeBps
      100, // stablecoinSlippage
      parseUnits('2', 18), // crvHarvestThreshold
      500, // crvSlippageTolerance
      addresses.NEW_GAUGE, // gauge
      '0xaebDA2c976cfd1eE1977Eac079B4382acb849325', // networkInfo.CURVE_USD_ORACLE,
    );
    await expect(tx2).to.emit(vaultWithLogicAbi, 'CurveParamsUpdated');

    const tx3 = vaultWithLogicAbi.connect(ownerSigner).setEightTwentyParams(150, 2000, 100e6);

    await expect(tx3).to.emit(vaultWithLogicAbi, 'EightyTwentyParamsUpdated');
  });
});
