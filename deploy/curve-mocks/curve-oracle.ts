import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { AggregatorV3Interface__factory } from '../../typechain-types';
import { getNetworkInfo } from '../network-info';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {
    deployments: { save, deploy },
    getNamedAccounts,
  } = hre;

  const { deployer } = await getNamedAccounts();

  const { CURVE_USD_ORACLE } = getNetworkInfo();

  if (CURVE_USD_ORACLE === undefined) {
    // deploying mock
    await deploy('CurveOracle', {
      contract: 'ChainlinkMock',
      from: deployer,
      log: true,
    });
  } else {
    await save('CurveOracle', { abi: AggregatorV3Interface__factory.abi, address: CURVE_USD_ORACLE });
  }
};

export default func;

func.tags = ['CurveOracle', 'CurveMocks'];
