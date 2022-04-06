import { PoolPrices, PoolLiquidity, Address } from '../src/types';
import { SwapSide } from '../src/constants';

export function checkConstantPoolPrices(
  poolPrices: PoolPrices<any>[],
  amounts: bigint[],
  dexKey: string,
) {
  for (const poolPrice of poolPrices) {
    expect(poolPrice.exchange).toEqual(dexKey);
    expect(poolPrice.prices.length).toEqual(amounts.length);
    for (let i = 0; i < poolPrice.prices.length; ++i) {
      expect(poolPrice.prices[i]).toEqual(amounts[i]);
    }
  }
}

// Assuming that the amounts are increasing at same interval, and start with 0
export function checkPoolPrices(
  poolPrices: PoolPrices<any>[],
  amounts: bigint[],
  side: SwapSide,
  dexKey: string,
) {
  for (const poolPrice of poolPrices) {
    expect(poolPrice.prices.length).toBe(amounts.length);
    expect(poolPrice.prices[0]).toEqual(BigInt(0));

    poolPrice.prices.forEach(p => expect(p).toBeGreaterThanOrEqual(0));
    expect(poolPrice.unit).toBeGreaterThanOrEqual(0);

    for (let i = 2; i < poolPrice.prices.length; ++i) {
      const prevMarginalPrice =
        poolPrice.prices[i - 1] - poolPrice.prices[i - 2];
      const currMarginalPrice = poolPrice.prices[i] - poolPrice.prices[i - 1];

      if (side === SwapSide.SELL)
        expect(currMarginalPrice).toBeLessThanOrEqual(prevMarginalPrice);
      else expect(currMarginalPrice).toBeGreaterThan(prevMarginalPrice);
    }

    expect(poolPrice.exchange).toEqual(dexKey);
  }
}

export function checkConstantPoolPrices(
  poolPrices: PoolPrices<any>[],
  amounts: bigint[],
  dexKey: string,
) {
  for (const poolPrice of poolPrices) {
    expect(poolPrice.exchange).toEqual(dexKey);
    expect(poolPrice.prices.length).toEqual(amounts.length);
    for (let i = 0; i < poolPrice.prices.length; ++i) {
      expect(poolPrice.prices[i]).toEqual(amounts[i]);
    }
  }
}

export function checkPoolsLiquidity(
  poolsLiquidity: PoolLiquidity[],
  tokenAddress: Address,
  dexKey: string,
) {
  poolsLiquidity.forEach(p => {
    expect(p.exchange).toEqual(dexKey);
    expect(p.liquidityUSD).toBeGreaterThanOrEqual(0);
    p.connectorTokens.forEach(t => {
      expect(t.address).not.toBe(tokenAddress);
      expect(t.decimals).toBeGreaterThanOrEqual(0);
    });
  });
}
