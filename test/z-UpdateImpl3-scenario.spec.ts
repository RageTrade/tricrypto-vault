import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import addresses from './fixtures/addresses';
import { increaseBlockTimestamp } from './utils/vault-helpers';
import { formatEther, parseEther, parseUnits, formatUnits } from 'ethers/lib/utils';
import {
  ERC20,
  ILPPriceGetter,
  ICurveGauge__factory,
  IERC20__factory,
  CurveYieldStrategy__factory,
  ProxyAdmin__factory,
  ClearingHouse__factory,
} from '../typechain-types';
import { activateMainnetFork } from './utils/mainnet-fork';

describe('Update Implementation', () => {
  before(async () => {
    await activateMainnetFork({
      network: 'arbitrum-mainnet',
      blockNumber: 117316170,
    });
  });

  it('tests updating implementation', async () => {
    const owner = '0xee2a909e3382cdf45a0d391202aff3fb11956ad1';
    const timelock = '0x39b54de853d9dca48e928a273c3bb5fa0299540a';
    const keeper = '0x0C0e6d63A7933e1C2dE16E1d5E61dB1cA802BF51';
    const oldUser = '0x507c7777837b85ede1e67f5a4554ddd7e58b1f87';
    const proxyAdmin = '0xA335Dd9CeFBa34449c0A89FB4d247f395C5e3782';
    const triCryptoWhale = '0x555766f3da968ecBefa690Ffd49A2Ac02f47aa5f';

    const vaultWithLogicAbi = await hre.ethers.getContractAt(
      'CurveYieldStrategy',
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

    const gauge = ICurveGauge__factory.connect(addresses.NEW_GAUGE, hre.ethers.provider);
    const usdc = IERC20__factory.connect(addresses.USDC, hre.ethers.provider);

    const clearingHouseImpl = '0xb10C6B050da0Ca0249fa38750281143efDe2feDA';
    const tricryptoImpl = '0x4fB60125AfF0B42A21a48e6c30511773D1E4dC21';

    const clearingHouse = ClearingHouse__factory.connect(
      '0x4521916972A76D5BFA65Fb539Cf7a0C2592050Ac',
      await hre.ethers.getSigner(owner),
    );
    const tricrypto = CurveYieldStrategy__factory.connect(
      '0x1d42783E7eeacae12EbC315D1D2D0E3C6230a068',
      await hre.ethers.getSigner(owner),
    );
    const proxyAdminContract = ProxyAdmin__factory.connect(proxyAdmin, await hre.ethers.getSigner(owner));

    const chInterface = [
      'function initiateGovernanceTransfer(address) external',
      'function acceptGovernanceTransfer() external',
      'function withdrawUSDCToTeamMultisig() external',
      'function withdrawProtocolFee(uint256) external',
      'function pause(uint256) external',
    ];

    const alternateCH = new ethers.Contract(clearingHouse.address, chInterface, await hre.ethers.getSigner(owner));

    const timelockSigner = await hre.ethers.getSigner(timelock);
    const keeperSigner = await hre.ethers.getSigner(keeper);
    const oldUserSigner = await hre.ethers.getSigner(oldUser);
    const ownerSigner = await hre.ethers.getSigner(owner);

    console.log('TOTAL SUPPLY BEFORE:', formatEther(await vaultWithLogicAbi.totalSupply()));
    console.log('TOTAL ASSETS BEFORE:', formatEther(await vaultWithLogicAbi.totalAssets()));
    console.log('OUTSTANDING PNL BEFORE:', formatUnits(await clearingHouse.getAccountNetProfit(0), 6));
    console.log('TRICRYPTO BAL IN GAUGE BEFORE:', formatUnits(await gauge.balanceOf(vaultWithLogicAbi.address)));
    console.log('USDC BAL IN 80-20 BEFORE:', formatUnits(await usdc.balanceOf(vaultWithLogicAbi.address), 6));

    await proxyAdminContract.connect(timelockSigner).transferOwnership(owner);
    await tricrypto.connect(timelockSigner).transferOwnership(owner);

    await alternateCH.connect(timelockSigner).initiateGovernanceTransfer(owner);
    await alternateCH.acceptGovernanceTransfer();

    await vaultWithLogicAbi
      .connect(ownerSigner)
      .updateBaseParams(0, owner, 0, await vaultWithLogicAbi.rebalancePriceThresholdBps());
    console.log('Updated base params');

    await vaultWithLogicAbi.connect(ownerSigner).rebalance();
    await increaseBlockTimestamp(10);
    console.log('Rebalanced');

    await proxyAdminContract.upgrade(clearingHouse.address, clearingHouseImpl);
    await proxyAdminContract.upgrade(tricrypto.address, tricryptoImpl);
    console.log('Upgraded');

    await alternateCH.withdrawProtocolFee(1);
    console.log('Fee withdrawn');

    await alternateCH.withdrawUSDCToTeamMultisig();
    console.log('USDC withdrawn');

    await alternateCH.pause(1);
    console.log('Paused clearing house');

    console.log('TOTAL SUPPLY AFTER:', formatEther(await vaultWithLogicAbi.totalSupply()));
    console.log('TOTAL ASSETS AFTER:', formatEther(await vaultWithLogicAbi.totalAssets()));
    console.log('OUTSTANDING PNL AFTER:', formatUnits(await clearingHouse.getAccountNetProfit(0), 6));
    console.log('TRICRYPTO BAL IN GAUGE AFTER:', formatUnits(await gauge.balanceOf(vaultWithLogicAbi.address)));
    console.log('USDC BAL IN 80-20 AFTER:', formatUnits(await usdc.balanceOf(vaultWithLogicAbi.address), 6));

    // old user is able to withdraw (& withdraw max)
    console.log('old user withdraw');
    await vaultWithLogicAbi
      .connect(oldUserSigner)
      .redeem(await vaultWithLogicAbi.balanceOf(oldUserSigner.address), oldUserSigner.address, oldUserSigner.address);
    expect(await vaultWithLogicAbi.balanceOf(oldUser)).to.eq(0);
  });
});
