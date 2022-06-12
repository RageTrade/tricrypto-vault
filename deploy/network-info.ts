import { truncate } from '@ragetrade/sdk';

export const skip = () => true;

export interface NetworkInfo {
  KEEPER_ADDRESS: string;

  DEPOSIT_CAP_C3CLT: number;

  UNISWAP_V3_FACTORY_ADDRESS: string;
  UNISWAP_V3_DEFAULT_FEE_TIER: number;
  UNISWAP_V3_ROUTER_ADDRESS: string;

  RAGE_CLEARING_HOUSE_ADDRESS?: string;
  RAGE_CLEARING_HOUSE_LENS_ADDRESS?: string;
  RAGE_SETTLEMENT_TOKEN_ADDRESS?: string;
  RAGE_ETH_VTOKEN_ADDRESS?: string;
  RAGE_SWAP_SIMULATOR?: string;

  CURVE_QUOTER?: string;
  CURVE_TOKEN_ADDRESS?: string;
  CURVE_GAUGE_ADDRESS?: string;
  CURVE_TRICRYPTO_POOL?: string;
  CURVE_TRICRYPTO_LP_TOKEN?: string;

  CURVE_USD_ORACLE?: string;
  ETH_USD_ORACLE: string;
  BTC_USD_ORACLE: string;
  USDT_USD_ORACLE: string;

  WETH_ADDRESS?: string;
  WBTC_ADDRESS?: string;
  USDT_ADDRESS?: string;
}

export const UNISWAP_V3_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
export const UNISWAP_V3_DEFAULT_FEE_TIER = 500;
export const UNISWAP_V3_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

export const arbitrumInfo: NetworkInfo = {
  KEEPER_ADDRESS: '0xe1829BaD81E9146E18f28E28691D930c052483bA',

  DEPOSIT_CAP_C3CLT: 1_000_000, // CURVE_TRICRYPTO_LP_TOKEN

  UNISWAP_V3_FACTORY_ADDRESS,
  UNISWAP_V3_DEFAULT_FEE_TIER,
  UNISWAP_V3_ROUTER_ADDRESS,

  CURVE_QUOTER: '0x2C2FC48c3404a70F2d33290d5820Edf49CBf74a5',
  // CURVE_TOKEN_ADDRESS: '0x11cdb42b0eb46d95f990bedd4695a6e3fa034978',
  // CURVE_GAUGE_ADDRESS: '0x97E2768e8E73511cA874545DC5Ff8067eB19B787',
  // CURVE_TRICRYPTO_POOL: '0x960ea3e3C7FB317332d990873d354E18d7645590',
  // CURVE_TRICRYPTO_LP_TOKEN: '0x8e0B8c8BB9db49a46697F3a5Bb8A308e744821D2',

  CURVE_USD_ORACLE: '0xaebDA2c976cfd1eE1977Eac079B4382acb849325',
  ETH_USD_ORACLE: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
  BTC_USD_ORACLE: '0x6ce185860a4963106506C203335A2910413708e9',
  USDT_USD_ORACLE: '0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7',

  // WETH_ADDRESS: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  // USDT_ADDRESS: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
};

export const arbitrumTestnetInfo: NetworkInfo = {
  KEEPER_ADDRESS: '0xe1829BaD81E9146E18f28E28691D930c052483bA',

  DEPOSIT_CAP_C3CLT: 1_000_000_000,

  UNISWAP_V3_FACTORY_ADDRESS,
  UNISWAP_V3_DEFAULT_FEE_TIER,
  UNISWAP_V3_ROUTER_ADDRESS: '0xE592427A0AEce92De3Edee1F18E0157C05861564',

  RAGE_CLEARING_HOUSE_ADDRESS: require('@ragetrade/core/deployments/arbtest/ClearingHouse.json').address,
  RAGE_CLEARING_HOUSE_LENS_ADDRESS: require('@ragetrade/core/deployments/arbtest/ClearingHouseLens.json').address,
  RAGE_SETTLEMENT_TOKEN_ADDRESS: require('@ragetrade/core/deployments/arbtest/SettlementToken.json').address,
  RAGE_ETH_VTOKEN_ADDRESS: require('@ragetrade/core/deployments/arbtest/ETH-vToken.json').address,
  RAGE_SWAP_SIMULATOR: require('@ragetrade/core/deployments/arbtest/SwapSimulator.json').address,

  ETH_USD_ORACLE: '0x5f0423B1a6935dc5596e7A24d98532b67A0AeFd8',
  BTC_USD_ORACLE: '0x0c9973e7a27d00e656B9f153348dA46CaD70d03d',
  USDT_USD_ORACLE: '0xb1Ac85E779d05C2901812d812210F6dE144b2df0',

  WETH_ADDRESS: '0xFCfbfcC11d12bCf816415794E5dc1BBcc5304e01',
  USDT_ADDRESS: '0x237b3B5238D2022aA80cAd1f67dAE53f353F74bF',
  WBTC_ADDRESS: '0xF2bf2a5CF00c9121A18d161F6738D39Ab576DB68',
};

// arbitrum mainnet fork
export const hardhatNetworkInfo: NetworkInfo = arbitrumInfo;

export function getNetworkInfo(chainId?: number): NetworkInfo {
  switch (chainId) {
    // case 42161: // TODO add core contract addresses above
    //   return arbitrumInfo;
    case 421611:
      return arbitrumTestnetInfo;
    case 31337:
      return hardhatNetworkInfo;
    default:
      throw new Error(`Chain ID ${chainId} is recognized, please add addresses to deploy/network-info.ts`);
  }
}
