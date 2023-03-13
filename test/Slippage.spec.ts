import { expect } from 'chai';
import { parseUnits, _fetchData } from 'ethers/lib/utils';
import hre, { ethers } from 'hardhat';
import { AggregatorV3Interface, ERC20 } from '../typechain-types';

import addresses from './fixtures/addresses';
import { unlockWhales } from './utils/curve-helper';

const changePriceToken = async (asset: 'USDC' | 'USDT', price: number) => {
  const contractAddr =
    asset == 'USDC' ? '0x2946220288dbbf77df0030fcecc2a8348cbbe32c' : '0xcb35fe6e53e71b30301ec4a3948da4ad3c65ace4';

  const slot =
    asset == 'USDC'
      ? '0x770facd49fd568a52044bd338eae1804cdf861291a3184eb31c009f1ba6181cb'
      : '0x6f16f7baac6ad0e1b4dfc196733039f7e73dd6cec43d90c3241a1672ba926e77';

  await hre.network.provider.send('hardhat_setStorageAt', [
    contractAddr, // address
    slot, // slot
    ethers.utils.hexZeroPad(ethers.utils.parseUnits(price.toString(), 8).toHexString(), 32), // new value
  ]);

  console.log(`${asset} price changed to ${price}`);
  console.log('---------------------');
};

describe('CurveYieldStrategy', () => {
  it('usdt to usdc - revert', async () => {
    const [admin, user1, user2] = await hre.ethers.getSigners();

    const swapManagerLib = await (await hre.ethers.getContractFactory('SwapManager')).deploy();

    const swapManager = await (
      await hre.ethers.getContractFactory('SwapManagerMock', {
        libraries: {
          ['contracts/libraries/SwapManager.sol:SwapManager']: swapManagerLib.address,
        },
      })
    ).deploy();

    const usdc = (await hre.ethers.getContractAt(
      '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
      addresses.USDC,
    )) as ERC20;

    const usdt = (await hre.ethers.getContractAt(
      '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
      addresses.USDT,
    )) as ERC20;

    const usdcOracle = (await hre.ethers.getContractAt(
      '@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol:AggregatorV3Interface',
      addresses.USDC_ORACLE,
    )) as AggregatorV3Interface;

    const usdtOracle = (await hre.ethers.getContractAt(
      '@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol:AggregatorV3Interface',
      addresses.USDT_ORACLE,
    )) as AggregatorV3Interface;

    await unlockWhales();
    const usdcWhale = await hre.ethers.getSigner(addresses.USDC_WHALE);

    const amount = parseUnits('100', 6);

    // should work at 3bps without if both are at 1$
    await usdc.connect(usdcWhale).transfer(swapManager.address, amount);
    await swapManager.connect(admin).swapUsdcToUsdtAndAddLiquidity(amount, 3);

    // increase price of usdc, so we give in less usdc to get same amount of usdt compared to when usdc = 1$
    await changePriceToken('USDT', 1.05);

    await usdc.connect(usdcWhale).transfer(swapManager.address, amount);
    await expect(swapManager.connect(admin).swapUsdcToUsdtAndAddLiquidity(amount, 3)).to.be.revertedWith(
      `VM Exception while processing transaction: reverted with reason string 'Too little received'`,
    );
  });

  it('usdc to usdt - revert', async () => {
    const [admin, user1, user2] = await hre.ethers.getSigners();

    const swapManagerLib = await (await hre.ethers.getContractFactory('SwapManager')).deploy();

    const swapManager = await (
      await hre.ethers.getContractFactory('SwapManagerMock', {
        libraries: {
          ['contracts/libraries/SwapManager.sol:SwapManager']: swapManagerLib.address,
        },
      })
    ).deploy();

    const usdc = (await hre.ethers.getContractAt(
      '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
      addresses.USDC,
    )) as ERC20;

    const usdt = (await hre.ethers.getContractAt(
      '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
      addresses.USDT,
    )) as ERC20;

    const usdcOracle = (await hre.ethers.getContractAt(
      '@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol:AggregatorV3Interface',
      addresses.USDC_ORACLE,
    )) as AggregatorV3Interface;

    const usdtOracle = (await hre.ethers.getContractAt(
      '@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol:AggregatorV3Interface',
      addresses.USDT_ORACLE,
    )) as AggregatorV3Interface;

    await unlockWhales();
    const usdtWhale = await hre.ethers.getSigner(addresses.USDT_WHALE);

    const amount = parseUnits('100', 6);

    // should work at 3bps without if both are at 1$
    await usdt.connect(usdtWhale).transfer(swapManager.address, amount);
    await swapManager.connect(admin).swapUsdtToUsdc(amount, 10);

    // increase price of usdc, so we give in less usdc to get same amount of usdt compared to when usdc = 1$
    await changePriceToken('USDT', 1.05);

    await usdt.connect(usdtWhale).transfer(swapManager.address, amount);
    await expect(swapManager.connect(admin).swapUsdtToUsdc(amount, 3)).to.be.revertedWith(
      `VM Exception while processing transaction: reverted with reason string 'Too little received'`,
    );
  });
});
