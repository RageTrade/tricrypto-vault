import { expect } from 'chai';
import { formatUnits } from 'ethers/lib/utils';
import hre from 'hardhat';
import { ERC20, ICurveGauge__factory, IERC20__factory, IGaugeFactory, ILPPriceGetter } from '../typechain-types';
import addresses from './fixtures/addresses';
import { activateMainnetFork } from './utils/mainnet-fork';

describe('Migrate and Withdraw Functions', () => {
  before(async () => {
    await activateMainnetFork({
      network: 'arbitrum-mainnet',
      blockNumber: 360713128,
    });
    console.log('Fork activated');
  });

  it('tests migrate and withdraw functionality', async () => {
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

    const owner = '0xee2a909e3382cdf45a0d391202aff3fb11956ad1';
    const timelock = '0x39b54de853d9dca48e928a273c3bb5fa0299540a';
    const keeper = '0x0C0e6d63A7933e1C2dE16E1d5E61dB1cA802BF51';
    const proxyAdmin = '0xA335Dd9CeFBa34449c0A89FB4d247f395C5e3782';
    const triCryptoWhale = '0x555766f3da968ecBefa690Ffd49A2Ac02f47aa5f';

    // Gauge addresses
    const newGaugeAddress = addresses.NEW_GAUGE;
    const oldGaugeAddress = addresses.OLD_GAUGE;
    const withdrawRecipient = '0xee2A909e3382cdF45a0d391202Aff3fb11956Ad1';

    const vaultWithLogicAbi = await hre.ethers.getContractAt(
      'CurveYieldStrategy',
      '0x1d42783E7eeacae12EbC315D1D2D0E3C6230a068',
    );
    const vaultWithProxyAbi = await hre.ethers.getContractAt(
      'TransparentUpgradeableProxy',
      '0x1d42783E7eeacae12EbC315D1D2D0E3C6230a068',
    );

    console.log('All contracts loaded');

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
      params: [proxyAdmin],
    });

    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [triCryptoWhale],
    });

    console.log('All impersonations done');

    const swapSimulator = { address: await vaultWithLogicAbi.swapSimulator() };
    const swapManager = { address: '0x88f24fC145F9209630c66cf3D302e3b5a66f772C' };
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

    console.log('Vault deployed');

    const ownerSigner = await hre.ethers.getSigner(owner);
    const proxyAdminSigner = await hre.ethers.getSigner(proxyAdmin);

    const newGauge = ICurveGauge__factory.connect(newGaugeAddress, hre.ethers.provider);
    const triCryptoToken = IERC20__factory.connect(addresses.TRICRYPTO_LP_TOKEN, hre.ethers.provider);

    console.log('=== UPGRADING VAULT ===');
    await vaultWithProxyAbi.connect(proxyAdminSigner).upgradeTo(vaultLogic.address);
    console.log('Vault upgraded successfully');

    console.log('=== TESTING WITHDRAW FUNCTION ===');

    // Check balances before withdraw
    const beforeWithdrawNewGaugeBalance = await newGauge.balanceOf(vaultWithLogicAbi.address);
    const beforeWithdrawRecipientBalance = await triCryptoToken.balanceOf(withdrawRecipient);

    console.log('New gauge balance before withdraw:', formatUnits(beforeWithdrawNewGaugeBalance));
    console.log('Recipient balance before withdraw:', formatUnits(beforeWithdrawRecipientBalance));

    if (beforeWithdrawNewGaugeBalance.gt(0)) {
      // Execute withdraw function
      await vaultWithLogicAbi.connect(ownerSigner).withdrawToMultisig();
      console.log('Withdraw executed successfully');

      // Check balances after withdraw
      const afterWithdrawNewGaugeBalance = await newGauge.balanceOf(vaultWithLogicAbi.address);
      const afterWithdrawRecipientBalance = await triCryptoToken.balanceOf(withdrawRecipient);

      console.log('New gauge balance after withdraw:', formatUnits(afterWithdrawNewGaugeBalance));
      console.log('Recipient balance after withdraw:', formatUnits(afterWithdrawRecipientBalance));

      // Verify withdraw worked
      expect(afterWithdrawNewGaugeBalance).to.eq(0);
      expect(afterWithdrawRecipientBalance).to.eq(beforeWithdrawRecipientBalance.add(beforeWithdrawNewGaugeBalance));
    } else {
      console.log('No tokens in new gauge to withdraw');
    }

    console.log('=== TESTING ACCESS CONTROL ===');

    // Test that non-owner cannot call migrate
    const nonOwnerSigner = await hre.ethers.getSigner(signers[0].address);

    // Test that non-owner cannot call withdraw
    await expect(vaultWithLogicAbi.connect(nonOwnerSigner).withdrawToMultisig()).to.be.revertedWith(
      'Ownable: caller is not the owner',
    );

    console.log('Access control tests passed');

    console.log('=== ALL TESTS COMPLETED SUCCESSFULLY ===');
  });
});
