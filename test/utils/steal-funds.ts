import hre from 'hardhat';

import { BigNumberish } from '@ethersproject/bignumber';
import { parseTokenAmount } from '@ragetrade/sdk';
import { ERC20 } from '../../typechain-types/artifacts/@openzeppelin/contracts/token/ERC20';
import { ethers } from 'ethers';

const { BigNumber } = ethers

export const generateErc20Balance = async (contract: ERC20, amount: BigNumberish, to?: string) => {
  to = to ?? (await contract.signer.getAddress());
  const slotKey = await getSlotInvolved(contract.populateTransaction.balanceOf(to));

  await hre.network.provider.send('hardhat_setStorageAt', [
    contract.address,
    ethers.utils.hexValue('0x' + slotKey),
    ethers.utils.hexZeroPad(BigNumber.from(amount).toHexString(), 32),
  ]);

  const balanceAfter = await contract.balanceOf(to);
  if (balanceAfter.toHexString() !== BigNumber.from(amount).toHexString()) {
    throw new Error('was unable to increase the balance');
  }
};

async function getSlotInvolved(ptx: ethers.PopulatedTransaction | Promise<ethers.PopulatedTransaction>) {
  const [signer] = await hre.ethers.getSigners();
  ptx = await ptx;
  delete (ptx as any).from;
  const tx = await signer.sendTransaction(await ptx);
  await tx.wait();

  const result = await hre.network.provider.send('debug_traceTransaction', [tx.hash]);
  const keys = (result.structLogs as any[])
    .filter((s: { op: string }) => s.op == 'SLOAD')
    .map((s: { stack: string[] }) => {
      const slotKey = (s.stack as string[]).pop();
      if (slotKey === undefined) {
        throw new Error('bad SLOAD');
      }
      return slotKey;
    });

  if (keys.length === 0) {
    throw new Error('SLOAD not found');
  }

  return keys[keys.length - 1];

}
export const stealFunds = async (
  tokenAddr: string,
  decimals: number,
  receiverAddress: string,
  amount: BigNumberish,
  whaleAddress: string,
) => {
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [whaleAddress],
  });
  const signer = await hre.ethers.getSigner(whaleAddress);
  await hre.network.provider.send('hardhat_setBalance', [signer.address, '0x1000000000000000000']);
  const tokenContract = await hre.ethers.getContractAt('IERC20', tokenAddr, signer);
  await tokenContract.transfer(receiverAddress, parseTokenAmount(amount, decimals));
};
