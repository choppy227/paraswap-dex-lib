import { DexParams } from './types';
import { DexConfigMap } from '../../types';
import { Network, SwapSide } from '../../constants';

export const GMXConfig: DexConfigMap<DexParams> = {
  GMX: {
    [Network.AVALANCHE]: {
      vaultAddress: '0x9ab2De34A33fB459b538c43f251eB825645e8595',
      priceFeed: '0x81b7e71a1d9e08a6ca016a0f4d6fa50dbce89ee3',
      fastPriceFeed: '0x7d9d108445f7e59a67da7c16a2ceb08c85b76a35',
      fastPriceEvents: '0x02b7023d43bc52bff8a0c54a9f2ecec053523bf6',
    },
  },
};

export const Adapters: {
  [chainId: number]: {
    [side: string]: { name: string; index: number }[] | null;
  };
} = {
  [Network.AVALANCHE]: {
    [SwapSide.SELL]: [
      {
        name: 'AvalancheAdapter01',
        index: 0, // TODO: fix the index as per the latest adapter
      },
    ],
  },
};
