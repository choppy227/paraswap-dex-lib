import { DexParams } from './types';
import { DexConfigMap, AdapterMappings } from '../../types';
import { Network, SwapSide } from '../../constants';

export const SolidlyConfig: DexConfigMap<DexParams> = {
  Solidly: {
    [Network.FANTOM]: {
      subgraphURL:
        'https://api.thegraph.com/subgraphs/name/deusfinance/solidly',
      factoryAddress: '0x3faab499b519fdc5819e3d7ed0c26111904cbc28',
      router: '0x56a14A1954b5d5FD7C636a24137a93742bA708b9', // ParaSwap-compatible Router with stable pools support
      initCode:
        '0x57ae84018c47ebdaf7ddb2d1216c8c36389d12481309af65428eb6d460f747a4',
      // Fixed Fees, same for volative and stable pools
      feeCode: 1,
      poolGasCost: 180 * 1000,
    },
  },
  Dystopia: {
    [Network.POLYGON]: {
      subgraphURL:
        'https://api.thegraph.com/subgraphs/name/dystopia-exchange/dystopia-v2',
      factoryAddress: '0x1d21Db6cde1b18c7E47B0F7F42f4b3F68b9beeC9',
      router: '0x0E98A8e5ca6067B98d10Eb6476ec30E232346402', // ParaSwap-compatible Router with stable pools support
      initCode:
        '0x009bce6d7eb00d3d075e5bd9851068137f44bba159f1cde806a268e20baaf2e8',
      // Fixed Fees, same for volative and stable pools
      feeCode: 5,
      poolGasCost: 180 * 1000,
    },
  },
  SpiritSwapV2: {
    [Network.FANTOM]: {
      // Later in Dystopia constructor it will be replaced with undefined
      // If we set here undefined, it will go search for non-existing config
      subgraphURL: '',
      factoryAddress: '0x9d3591719038752db0c8bEEe2040FfcC3B2c6B9c',
      router: '0x56a14A1954b5d5FD7C636a24137a93742bA708b9', // ParaSwap-compatible Router with stable pools support
      initCode:
        '0x5442fb448d86f32a7d2a9dc1a457e64bf5a6c77415d98802aac4fb5a9dc5ecd9',
      // updatable fees on the pool contract without event
      stableFee: 4, // 10000 / 2500 = 4 in BPS
      volatileFee: 18, // ceil(10000 / 556) = 18 in BPS
      poolGasCost: 180 * 1000,
      feeCode: 4,
    },
  },
  Velodrome: {
    [Network.OPTIMISM]: {
      subgraphURL: 'https://api.thegraph.com/subgraphs/name/dmihal/velodrome',
      factoryAddress: '0x25cbddb98b35ab1ff77413456b31ec81a6b6b746',
      router: '0xa2f581b012E0f2dcCDe86fCbfb529f4aC5dD4983', // ParaSwap-compatible Router with stable pools support
      initCode:
        '0xc1ac28b1c4ebe53c0cff67bab5878c4eb68759bb1e9f73977cd266b247d149f0',
      // updatable fees on the factory without event
      stableFee: 2,
      volatileFee: 2,
      poolGasCost: 180 * 1000,
      feeCode: 2,
    },
  },
};

// TODO: segment adapters by dex key
export const Adapters: Record<number, AdapterMappings> = {
  [Network.POLYGON]: {
    [SwapSide.SELL]: [{ name: 'PolygonAdapter02', index: 3 }], // dystopia
  },
  [Network.FANTOM]: {
    [SwapSide.SELL]: [{ name: 'FantomAdapter01', index: 10 }], // solidly + spiritSwapV2
  },
  [Network.OPTIMISM]: {
    [SwapSide.SELL]: [{ name: 'OptimismAdapter01', index: 8 }], // velodrome
  },
};
