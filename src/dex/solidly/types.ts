import {
  UniswapV2Data,
  UniswapV2PoolOrderedParams,
  DexParams as UniswapV2DexParams,
} from '../uniswap-v2/types';
import { UniswapV2Pair } from '../uniswap-v2/uniswap-v2';

export type PoolState = {
  reserves0: string;
  reserves1: string;
  feeCode: number;
};

// to calculate prices for stable pool, we need decimals of the stable tokens
export interface SolidlyPoolOrderedParams extends UniswapV2PoolOrderedParams {
  decimalsIn: number;
  decimalsOut: number;
  stable: boolean;
}

export type SolidlyData = UniswapV2Data;

export interface DexParams extends Omit<UniswapV2DexParams, 'feeCode'> {
  feeCode: number;
  stableFee?: number;
  volatileFee?: number;
}

export interface SolidlyPair extends UniswapV2Pair {
  stable: boolean;
}
