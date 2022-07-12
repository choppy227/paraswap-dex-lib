import { BI_POWS } from './bigint-constants';
import { ETHER_ADDRESS, Network } from './constants';
import { Address, Token, DexConfigMap } from './types';

export const isETHAddress = (address: string) =>
  address.toLowerCase() === ETHER_ADDRESS.toLowerCase();

export const prependWithOx = (str: string) =>
  str.startsWith('0x') ? str : '0x' + str;

export const uuidToBytes16 = (uuid: string) => '0x' + uuid.replace(/-/g, '');

// This function guarantees that the distribution adds up to exactly 100% by
// applying rounding in the other direction for numbers with the most error.
export function convertToBasisPoints(dist: number[]): number[] {
  const BPS = 10000;
  const sumDist = dist.reduce((a, b) => a + b, 0);
  const basisPoints = dist.map(n => (n * BPS) / sumDist);
  const rounded = basisPoints.map(n => Math.round(n));
  const sumRounded = rounded.reduce((a, b) => a + b, 0);
  if (sumRounded === BPS) {
    return rounded;
  }
  const errors = basisPoints.map((n, i) => ({
    error: rounded[i] - n,
    index: i,
  }));
  if (sumRounded < BPS) {
    errors.sort((a, b) => a.error - b.error);
    for (let i = 0; i < BPS - sumRounded; ++i) {
      ++rounded[errors[i].index];
    }
  } else {
    errors.sort((a, b) => b.error - a.error);
    for (let i = 0; i < sumRounded - BPS; ++i) {
      --rounded[errors[i].index];
    }
  }
  return rounded;
}

export function getDexKeysWithNetwork<T>(
  dexConfig: DexConfigMap<T>,
): { key: string; networks: Network[] }[] {
  return Object.entries(dexConfig).map(([dKey, dValue]) => ({
    key: dKey,
    networks: Object.keys(dValue).map(n => parseInt(n)),
  }));
}

// This is needed in order to not modify existing logic and use this wrapper
// to be safe if we receive not cached decimals
export function getBigIntPow(decimals: number): bigint {
  const value = BI_POWS[decimals];
  // It is not accurate to create 10 ** 23 and more decimals from number type
  return value === undefined ? BigInt(`1${'0'.repeat(decimals)}`) : value;
}

export const _require = (b: boolean, message: string) => {
  if (!b) throw new Error(message);
};
