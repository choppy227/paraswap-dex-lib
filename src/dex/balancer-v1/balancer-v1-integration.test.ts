import dotenv from 'dotenv';
dotenv.config();

import { DummyDexHelper } from '../../dex-helper/index';
import { Network, SwapSide } from '../../constants';
import { BalancerV1 } from './balancer-v1';
import { checkPoolPrices, checkPoolsLiquidity } from '../../../tests/utils';
import { Tokens } from '../../../tests/constants-e2e';

const network = Network.MAINNET;
const TokenASymbol = 'WETH';
const TokenA = Tokens[network][TokenASymbol];

const TokenBSymbol = 'DAI';
const TokenB = Tokens[network][TokenBSymbol];

const amounts = [
  0n,
  100000000000000000n,
  200000000000000000n,
  300000000000000000n,
  400000000000000000n,
  500000000000000000n,
  600000000000000000n,
  700000000000000000n,
  800000000000000000n,
  900000000000000000n,
  1000000000000000000n,
];

const dexKey = 'BalancerV1';

describe('BalancerV1', function () {
  it('getPoolIdentifiers and getPricesVolume SELL', async function () {
    const dexHelper = new DummyDexHelper(network);
    await dexHelper.init();
    const blocknumber = dexHelper.blockManager.getLatestBlockNumber();
    const balancerV1 = new BalancerV1(dexHelper, dexKey);

    await balancerV1.setupEventPools(blocknumber);

    const pools = await balancerV1.getPoolIdentifiers(
      TokenA,
      TokenB,
      SwapSide.SELL,
      blocknumber,
    );
    console.log(`${TokenASymbol} <> ${TokenBSymbol} Pool Identifiers: `, pools);

    expect(pools.length).toBeGreaterThan(0);

    const poolPrices = await balancerV1.getPricesVolume(
      TokenA,
      TokenB,
      amounts,
      SwapSide.SELL,
      blocknumber,
      pools,
    );
    console.log(`${TokenASymbol} <> ${TokenBSymbol} Pool Prices: `, poolPrices);

    expect(poolPrices).not.toBeNull();
    checkPoolPrices(poolPrices!, amounts, SwapSide.SELL, dexKey);
  });

  it('getPoolIdentifiers and getPricesVolume BUY', async function () {
    const dexHelper = new DummyDexHelper(network);
    await dexHelper.init();

    const blocknumber = dexHelper.blockManager.getLatestBlockNumber();
    const balancerV1 = new BalancerV1(dexHelper, dexKey);

    await balancerV1.setupEventPools(blocknumber);

    const pools = await balancerV1.getPoolIdentifiers(
      TokenA,
      TokenB,
      SwapSide.BUY,
      blocknumber,
    );
    console.log(`${TokenASymbol} <> ${TokenBSymbol} Pool Identifiers: `, pools);

    expect(pools.length).toBeGreaterThan(0);

    const poolPrices = await balancerV1.getPricesVolume(
      TokenA,
      TokenB,
      amounts,
      SwapSide.BUY,
      blocknumber,
      pools,
    );
    console.log(`${TokenASymbol} <> ${TokenBSymbol} Pool Prices: `, poolPrices);

    expect(poolPrices).not.toBeNull();
    checkPoolPrices(poolPrices!, amounts, SwapSide.BUY, dexKey);
  });

  it('getTopPoolsForToken', async function () {
    const dexHelper = new DummyDexHelper(network);
    await dexHelper.init();
    const balancerV1 = new BalancerV1(dexHelper, dexKey);

    const poolLiquidity = await balancerV1.getTopPoolsForToken(
      TokenA.address,
      10,
    );
    console.log(`${TokenASymbol} Top Pools:`, poolLiquidity);

    checkPoolsLiquidity(poolLiquidity, TokenA.address, dexKey);
  });
});
