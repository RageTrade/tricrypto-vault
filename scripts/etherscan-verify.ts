import hre, { deployments } from 'hardhat';

async function main() {
  const { get } = deployments;

  const swapManagerLibrary = { address: '0x88f24fC145F9209630c66cf3D302e3b5a66f772C' };
  // const logicLibrary = await hreVerify('LogicLibrary', {
  //   libraries: {
  //     SwapManager: swapManagerLibrary.address,
  //   },
  // });
  const logicLibraryAddress = '0xC233C8b40EF6e315d7a78FaC32CD0eb7Ba4CAb6C';
  const swapSimulatorAddress = '0x5c92846A38E75e56ef6935A2B12fF832F1FA80ac';

  await hreVerify('CurveYieldStrategyLogic', {
    libraries: {
      SwapManager: swapManagerLibrary.address,
      Logic: logicLibraryAddress,
    },
    constructorArguments: [swapSimulatorAddress],
  });

  // await hreVerify('CurveYieldStrategy');

  // await hreVerify('VaultPeriphery');

  // helper method that verify a contract and returns the deployment
  async function hreVerify(label: string, taskArguments: any = {}) {
    console.log('verifying:', label);

    // const deployment = await get(label);
    const address =
      label === 'LogicLibrary'
        ? '0xC233C8b40EF6e315d7a78FaC32CD0eb7Ba4CAb6C'
        : label === 'CurveYieldStrategyLogic'
        ? '0xC614C9DC1C5AB9162eF429316695D56EDe48099d'
        : undefined;

    console.log('address', address);

    taskArguments = { address, ...taskArguments };

    // try to verify on etherscan
    try {
      await hre.run('verify:verify', taskArguments);
    } catch (err: any) {
      console.log(err);
    }
    // return deployment;
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
