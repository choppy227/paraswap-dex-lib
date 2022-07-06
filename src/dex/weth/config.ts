import { DexParams } from './types';
import { DexConfigMap } from '../../types';
import { Network } from '../../constants';
import { SwapSide } from 'paraswap-core';

const WethGasCost = 50 * 1000;

export const WethConfig: DexConfigMap<DexParams> = {
  Weth: {
    [Network.MAINNET]: {
      poolGasCost: WethGasCost,
    },
    [Network.ROPSTEN]: {
      poolGasCost: WethGasCost,
    },
    [Network.RINKEBY]: {
      poolGasCost: WethGasCost,
    },
    [Network.ARBITRUM]: {
      poolGasCost: WethGasCost,
    },
  },
  Wbnb: {
    [Network.BSC]: {
      poolGasCost: WethGasCost,
    },
  },
  Wmatic: {
    [Network.POLYGON]: {
      poolGasCost: WethGasCost,
    },
  },
  Wftm: {
    [Network.FANTOM]: {
      poolGasCost: WethGasCost,
    },
  },
  Wavax: {
    [Network.AVALANCHE]: {
      poolGasCost: WethGasCost,
    },
  },
};

export const Adapters: {
  [chainId: number]: {
    [side: string]: { name: string; index: number }[];
  };
} = {
  [Network.AVALANCHE]: {
    [SwapSide.SELL]: [{ name: 'AvalancheAdapter01', index: 1 }],
  },
  [Network.BSC]: { [SwapSide.SELL]: [{ name: 'BscAdapter01', index: 1 }] },
  [Network.FANTOM]: {
    [SwapSide.SELL]: [{ name: 'FantomAdapter01', index: 1 }],
  },
  [Network.MAINNET]: { [SwapSide.SELL]: [{ name: 'Adapter02', index: 5 }] },
  [Network.POLYGON]: {
    [SwapSide.SELL]: [{ name: 'PolygonAdapter01', index: 2 }],
  },
  [Network.ARBITRUM]: {
    [SwapSide.SELL]: [{ name: 'ArbitrumAdapter01', index: 1 }],
  },
};
