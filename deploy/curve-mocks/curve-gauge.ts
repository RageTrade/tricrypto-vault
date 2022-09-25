import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { ICurveGauge__factory } from '../../typechain-types';
import { getNetworkInfo } from '../network-info';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {
    deployments: { save, deploy, get, read, execute },
    getNamedAccounts,
  } = hre;

  const { deployer } = await getNamedAccounts();

  const { CURVE_NEW_GAUGE } = getNetworkInfo();

  if (CURVE_NEW_GAUGE === undefined) {
    // deploying mock
    const CurveGaugeDeployment = await deploy('CurveGauge', {
      contract: 'RewardsGaugeMock',
      from: deployer,
      log: true,
      args: [(await get('CurveToken')).address, (await get('CurveTriCryptoLpToken')).address],
    });

    if (CurveGaugeDeployment.newlyDeployed) {
      const MINTER_ROLE = await read('CurveToken', 'MINTER_ROLE');
      await execute(
        'CurveToken',
        { from: deployer, log: true },
        'grantRole',
        MINTER_ROLE,
        CurveGaugeDeployment.address,
      );
    }
  } else {
    await save('CurveGauge', { abi: ICurveGauge__factory.abi, address: CURVE_NEW_GAUGE });
  }
};

export default func;

func.tags = ['CurveGauge', 'CurveMocks'];
func.dependencies = ['CurveToken', 'CurveTriCryptoLpToken'];
