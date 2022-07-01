import dotenv from 'dotenv';
dotenv.config();

import {
  DummyDexHelper,
  DummyLimitOrderProvider,
} from '../../dex-helper/index';
import { Network, SwapSide } from '../../constants';
import { BI_POWS } from '../../bigint-constants';
import { ParaSwapLimitOrders } from './paraswap-limit-orders';
import {
  checkPoolPrices,
  checkPoolsLiquidity,
  checkConstantPoolPrices,
} from '../../../tests/utils';
import { Tokens } from '../../../tests/constants-e2e';

const network = Network.ROPSTEN;
const TokenASymbol = 'WETH';
const TokenA = Tokens[network][TokenASymbol];

const TokenBSymbol = 'USDC';
const TokenB = Tokens[network][TokenBSymbol];

const amounts = [
  0n,
  1n * BI_POWS[TokenA.decimals],
  2n * BI_POWS[TokenA.decimals],
  3n * BI_POWS[TokenA.decimals],
  4n * BI_POWS[TokenA.decimals],
  5n * BI_POWS[TokenA.decimals],
  6n * BI_POWS[TokenA.decimals],
  7n * BI_POWS[TokenA.decimals],
  75n * BI_POWS[TokenA.decimals - 1],
  8n * BI_POWS[TokenA.decimals],
];

const expectedPricesOnSell = [
  0n,
  100000000n,
  197500000n,
  295000000n,
  391000000n,
  487000000n,
  583000000n,
  675000000n,
  722750000n,
  770500000n,
];

const amountsBuy = [
  0n,
  100n * BI_POWS[TokenB.decimals],
  200n * BI_POWS[TokenB.decimals],
  300n * BI_POWS[TokenB.decimals],
  400n * BI_POWS[TokenB.decimals],
  500n * BI_POWS[TokenB.decimals],
  600n * BI_POWS[TokenB.decimals],
  700n * BI_POWS[TokenB.decimals],
  825n * BI_POWS[TokenB.decimals],
  950n * BI_POWS[TokenB.decimals],
];

const expectedPricesOnBuy = [
  0n,
  1000000000000000000n,
  2025641025641025641n,
  3052083333333333333n,
  4093750000000000000n,
  5135416666666666666n,
  6177083333333333333n,
  7261780104712041884n,
  8570680628272251308n,
  9879581151832460732n,
];

const dexKey = 'ParaSwapLimitOrders';

const tokenABKey = DummyLimitOrderProvider.getOrderBookCacheKey(
  network,
  TokenA.address,
  TokenB.address,
);

const dummyOrderBook = {
  [tokenABKey]: [
    // Orders: Maker = USDC, Taker = WETH
    {
      swappableMakerBalance: (100n * BI_POWS[TokenB.decimals]).toString(),
      swappableTakerBalance: (1n * BI_POWS[TokenA.decimals]).toString(),
    },
    {
      swappableMakerBalance: (195n * BI_POWS[TokenB.decimals]).toString(),
      swappableTakerBalance: (2n * BI_POWS[TokenA.decimals]).toString(),
    },
    {
      swappableMakerBalance: (480n * BI_POWS[TokenB.decimals]).toString(),
      swappableTakerBalance: (5n * BI_POWS[TokenA.decimals]).toString(),
    },
    {
      swappableMakerBalance: (955n * BI_POWS[TokenB.decimals]).toString(),
      swappableTakerBalance: (10n * BI_POWS[TokenA.decimals]).toString(),
    },
  ],
};

describe('ParaSwapLimitOrders', function () {
  let dummyLimitOrderProvider: DummyLimitOrderProvider;
  let dexHelper: DummyDexHelper;
  let blockNumber: number;
  let paraSwapLimitOrders: ParaSwapLimitOrders;

  beforeAll(async () => {
    dexHelper = new DummyDexHelper(network);
    blockNumber = await dexHelper.provider.getBlockNumber();
    paraSwapLimitOrders = new ParaSwapLimitOrders(network, dexKey, dexHelper);
    dummyLimitOrderProvider = new DummyLimitOrderProvider();
    dummyLimitOrderProvider.setOrderBook(
      network,
      TokenA.address,
      TokenB.address,
      dummyOrderBook[tokenABKey],
    );

    paraSwapLimitOrders.limitOrderProvider = dummyLimitOrderProvider;
  });

  it('getPoolIdentifiers and getPricesVolume SELL Unswappable amount', async function () {
    const pools = await paraSwapLimitOrders.getPoolIdentifiers(
      TokenA,
      TokenB,
      SwapSide.SELL,
      blockNumber,
    );
    console.log(`${TokenASymbol} <> ${TokenBSymbol} Pool Identifiers: `, pools);

    expect(pools.length).toBeGreaterThan(0);

    const poolPrices = await paraSwapLimitOrders.getPricesVolume(
      TokenA,
      TokenB,
      [0n, 20n * BI_POWS[TokenA.decimals], 260n * BI_POWS[TokenA.decimals]],
      SwapSide.SELL,
      blockNumber,
      pools,
    );
    console.log(`${TokenASymbol} <> ${TokenBSymbol} Pool Prices: `, poolPrices);

    expect(poolPrices![0].prices[1].toString()).toEqual('0');
    expect(poolPrices![0].prices[2].toString()).toEqual('0');
  });

  it('getPoolIdentifiers and getPricesVolume SELL', async function () {
    const pools = await paraSwapLimitOrders.getPoolIdentifiers(
      TokenA,
      TokenB,
      SwapSide.SELL,
      blockNumber,
    );
    console.log(`${TokenASymbol} <> ${TokenBSymbol} Pool Identifiers: `, pools);

    expect(pools.length).toBeGreaterThan(0);

    const poolPrices = await paraSwapLimitOrders.getPricesVolume(
      TokenA,
      TokenB,
      amounts,
      SwapSide.SELL,
      blockNumber,
      pools,
    );
    console.log(`${TokenASymbol} <> ${TokenBSymbol} Pool Prices: `, poolPrices);

    expect(poolPrices).not.toBeNull();
    if (paraSwapLimitOrders.hasConstantPriceLargeAmounts) {
      checkConstantPoolPrices(poolPrices!, amounts, dexKey);
    } else {
      checkPoolPrices(poolPrices!, amounts, SwapSide.SELL, dexKey);
    }

    // Check pricing values
    for (let i = 0; i < expectedPricesOnSell.length; i++) {
      expect(poolPrices![0].prices[i].toString()).toEqual(
        expectedPricesOnSell[i].toString(),
      );
    }
  });
  it('getPoolIdentifiers and getPricesVolume BUY Unswappable amount', async function () {
    const pools = await paraSwapLimitOrders.getPoolIdentifiers(
      TokenA,
      TokenB,
      SwapSide.BUY,
      blockNumber,
    );
    console.log(`${TokenASymbol} <> ${TokenBSymbol} Pool Identifiers: `, pools);

    expect(pools.length).toBeGreaterThan(0);

    const poolPrices = await paraSwapLimitOrders.getPricesVolume(
      TokenA,
      TokenB,
      [
        0n,
        1700n * BI_POWS[TokenB.decimals],
        2000000n * BI_POWS[TokenB.decimals],
      ],
      SwapSide.BUY,
      blockNumber,
      pools,
    );
    console.log(`${TokenASymbol} <> ${TokenBSymbol} Pool Prices: `, poolPrices);

    expect(poolPrices![0].prices[1].toString()).toEqual('0');
    expect(poolPrices![0].prices[2].toString()).toEqual('0');
  });

  it('getPoolIdentifiers and getPricesVolume BUY', async function () {
    const pools = await paraSwapLimitOrders.getPoolIdentifiers(
      TokenA,
      TokenB,
      SwapSide.BUY,
      blockNumber,
    );
    console.log(`${TokenASymbol} <> ${TokenBSymbol} Pool Identifiers: `, pools);

    expect(pools.length).toBeGreaterThan(0);

    const poolPrices = await paraSwapLimitOrders.getPricesVolume(
      TokenA,
      TokenB,
      amountsBuy,
      SwapSide.BUY,
      blockNumber,
      pools,
    );
    console.log(`${TokenASymbol} <> ${TokenBSymbol} Pool Prices: `, poolPrices);

    expect(poolPrices).not.toBeNull();
    if (paraSwapLimitOrders.hasConstantPriceLargeAmounts) {
      checkConstantPoolPrices(poolPrices!, amounts, dexKey);
    } else {
      checkPoolPrices(poolPrices!, amountsBuy, SwapSide.BUY, dexKey);
    }

    for (let i = 0; i < expectedPricesOnBuy.length; i++) {
      expect(poolPrices![0].prices[i].toString()).toEqual(
        expectedPricesOnBuy[i].toString(),
      );
    }
  });

  it('getTopPoolsForToken', async function () {
    // TODO: Add getTopPools when we support it
    // const poolLiquidity = await paraswapLimitOrders.getTopPoolsForToken(
    //   TokenA.address,
    //   10,
    // );
    // console.log(`${TokenASymbol} Top Pools:`, poolLiquidity);
    // if (!paraswapLimitOrders.hasConstantPriceLargeAmounts) {
    //   checkPoolsLiquidity(poolLiquidity, TokenA.address, dexKey);
    // }
  });
});
