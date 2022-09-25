import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { CurveYieldStrategy__factory } from '../typechain-types';
import { waitConfirmations } from './network-info';
import { DeployExtended } from './types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {
    deployments: { deploy, get },
    getNamedAccounts,
  } = hre;

  const { deployer } = await getNamedAccounts();

  const logicLib = await get('LogicLibrary');
  const swapManagerLib = await get('SwapManagerLibrary');

  await (deploy as unknown as DeployExtended<CurveYieldStrategy__factory>)('CurveYieldStrategyLogic', {
    contract: 'CurveYieldStrategy',
    libraries: {
      SwapManager: swapManagerLib.address,
      Logic: logicLib.address,
    },
    args: [(await get('SwapSimulator')).address],
    from: deployer,
    log: true,
    waitConfirmations,
  });
};

export default func;

func.tags = ['CurveYieldStrategyLogic', 'TricryptoVault'];
func.dependencies = ['LogicLibrary', 'SwapManagerLibrary', 'SwapSimulator'];
