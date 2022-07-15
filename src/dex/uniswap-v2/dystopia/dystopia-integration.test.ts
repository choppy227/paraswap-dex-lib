import dotenv from 'dotenv';
dotenv.config();

import { DummyDexHelper } from '../../../dex-helper';
import { Network, SwapSide } from '../../../constants';
import { checkPoolPrices, checkPoolsLiquidity } from '../../../../tests/utils';
import { BI_POWS } from '../../../bigint-constants';
import { Dystopia } from './dystopia';
import { Tokens } from '../../../../tests/constants-e2e';
import { Interface, Result } from '@ethersproject/abi';
import dystopiaPairABI from '../../../abi/uniswap-v2/DystPair.json';

const amounts18 = [0n, BI_POWS[18], 2000000000000000000n];
const amounts6 = [0n, BI_POWS[6], BI_POWS[6] * 2n];

const dexKey = 'Dystopia';
const network = Network.POLYGON;
const dexHelper = new DummyDexHelper(network);
const dystopia = new Dystopia(network, dexKey, dexHelper);

function getReaderCalldata(
  exchangeAddress: string,
  readerIface: Interface,
  amounts: bigint[],
  funcName: string,
  tokenIn: string,
) {
  return amounts.map(amount => ({
    target: exchangeAddress,
    callData: readerIface.encodeFunctionData(funcName, [amount, tokenIn]),
  }));
}

function decodeReaderResult(
  results: Result,
  readerIface: Interface,
  funcName: string,
) {
  return results.map(result => {
    const parsed = readerIface.decodeFunctionResult(funcName, result);
    return BigInt(parsed[0]._hex);
  });
}

async function checkOnChainPricing(
  dystopia: Dystopia,
  funcName: string,
  blockNumber: number,
  prices: bigint[],
  exchangeAddress: string,
  tokenIn: string,
  amounts: bigint[],
) {
  const readerIface = new Interface(dystopiaPairABI as any);

  const readerCallData = getReaderCalldata(
    exchangeAddress,
    readerIface,
    amounts.slice(1),
    funcName,
    tokenIn,
  );
  console.log('readerCallData', readerCallData);
  const readerResult = (
    await dexHelper.multiContract.methods
      .aggregate(readerCallData)
      .call({}, blockNumber)
  ).returnData;
  const expectedPrices = [0n].concat(
    decodeReaderResult(readerResult, readerIface, funcName),
  );

  expect(prices).toEqual(expectedPrices);
}

describe('Dystopia', function () {
  describe('UniswapV2 like pool', function () {
    const TokenASymbol = 'WETH';
    const tokenA = Tokens[network][TokenASymbol];
    const TokenBSymbol = 'WMATIC';
    const tokenB = Tokens[network][TokenBSymbol];

    const amounts = amounts18;

    it('getPoolIdentifiers and getPricesVolume', async function () {
      const blocknumber = await dexHelper.web3Provider.eth.getBlockNumber();
      const dystopia = new Dystopia(network, dexKey, dexHelper);
      const pools = await dystopia.getPoolIdentifiers(
        tokenA,
        tokenB,
        SwapSide.SELL,
        blocknumber,
      );
      console.log(
        `${TokenASymbol} <> ${TokenBSymbol} Pool Identifiers: `,
        pools,
      );

      expect(pools.length).toBeGreaterThan(0);

      const poolPrices = await dystopia.getPricesVolume(
        tokenA,
        tokenB,
        amounts,
        SwapSide.SELL,
        blocknumber,
        pools,
      );
      console.log(
        `${TokenASymbol} <> ${TokenBSymbol} Pool Prices: `,
        poolPrices,
      );

      expect(poolPrices).not.toBeNull();
      checkPoolPrices(poolPrices!, amounts, SwapSide.SELL, dexKey);

      // Check if onchain pricing equals to calculated ones

      for (const i in poolPrices || []) {
        await checkOnChainPricing(
          dystopia,
          'getAmountOut',
          blocknumber,
          poolPrices![i].prices,
          poolPrices![i].poolAddresses![0],
          tokenA.address,
          amounts,
        );
      }
    });

    it('getTopPoolsForToken', async function () {
      const dexHelper = new DummyDexHelper(Network.POLYGON);
      const dystopia = new Dystopia(Network.POLYGON, dexKey, dexHelper);

      const poolLiquidity = await dystopia.getTopPoolsForToken(
        tokenA.address,
        10,
      );
      console.log(`${TokenASymbol} Top Pools:`, poolLiquidity);

      checkPoolsLiquidity(poolLiquidity, tokenA.address, dexKey);
    });
  });

  describe('Curve like stable pool', function () {
    const TokenASymbol = 'DAI'; // 'USDT';
    const tokenA = Tokens[Network.POLYGON][TokenASymbol];
    const TokenBSymbol = 'USDC';
    const tokenB = Tokens[Network.POLYGON][TokenBSymbol];

    const amounts = amounts18; // amounts6;

    it('getPoolIdentifiers and getPricesVolume', async function () {
      const dexHelper = new DummyDexHelper(Network.POLYGON);
      const blocknumber = await dexHelper.web3Provider.eth.getBlockNumber();
      const pools = await dystopia.getPoolIdentifiers(
        tokenA,
        tokenB,
        SwapSide.SELL,
        blocknumber,
      );
      console.log(
        `${TokenASymbol} <> ${TokenBSymbol} Pool Identifiers: `,
        pools,
      );

      expect(pools.length).toBeGreaterThan(0);

      const poolPrices = await dystopia.getPricesVolume(
        tokenA,
        tokenB,
        amounts,
        SwapSide.SELL,
        blocknumber,
        pools,
      );
      console.log(
        `${TokenASymbol} <> ${TokenBSymbol} Pool Prices: `,
        poolPrices,
      );

      expect(poolPrices).not.toBeNull();
      checkPoolPrices(poolPrices!, amounts, SwapSide.SELL, dexKey);

      // Check if onchain pricing equals to calculated ones
      for (const i in poolPrices || []) {
        await checkOnChainPricing(
          dystopia,
          'getAmountOut',
          blocknumber,
          poolPrices![i].prices,
          poolPrices![i].poolAddresses![0],
          tokenA.address,
          amounts,
        );
      }
    });

    it('getTopPoolsForToken', async function () {
      const dexHelper = new DummyDexHelper(Network.POLYGON);
      const dystopiaStable = new Dystopia(Network.POLYGON, dexKey, dexHelper);

      const poolLiquidity = await dystopiaStable.getTopPoolsForToken(
        tokenA.address,
        10,
      );
      console.log(`${TokenASymbol} Top Pools:`, poolLiquidity);

      checkPoolsLiquidity(poolLiquidity, tokenA.address, dexKey);
    });
  });
});
