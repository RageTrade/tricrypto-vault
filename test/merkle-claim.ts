import { expect } from 'chai';
import * as tree from '../m.json';
import hre, { ethers } from 'hardhat';
import { ERC20 } from '../typechain-types';
import { activateMainnetFork } from './utils/mainnet-fork';
import { generateErc20Balance } from './utils/steal-funds';

let used = new Set();

const claims = (tree as any).claims;
const keys = Object.keys(claims);

function getRandomProof(min: number, max: number): any {
  min = Math.ceil(min);
  max = Math.floor(max);

  const num = Math.floor(Math.random() * (max - min + 1) + min);

  if (used.has(num)) {
    return getRandomProof(min, max);
  }

  used.add(num);

  return keys[num];
}

describe('proof', () => {
  before(async () => {
    await activateMainnetFork({
      network: 'arbitrum-mainnet',
      blockNumber: 117747050 + 1,
    });
  });

  it('tests claim', async () => {
    const usdc = (await hre.ethers.getContractAt(
      '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
      '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    )) as ERC20;

    const dist = new ethers.Contract(
      '0x49C50Bf6235cD88Bb9260B496521d6980874468B',
      ['function claim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof)'],
      hre.ethers.provider,
    );

    const sample = 20;

    for (let i = 0; i < sample; i++) {
      const key = getRandomProof(0, 17599);
      const proof = claims[key];

      await hre.network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [key],
      });

      const signer = await hre.ethers.getSigner(key);

      await generateErc20Balance(usdc, proof.amount, dist.address);

      expect(await dist.connect(signer).claim(proof.index, key, proof.amount, proof.proof)).to.changeTokenBalance(
        usdc,
        key,
        proof.amount,
      );
      console.log(key);
    }
  });
});
