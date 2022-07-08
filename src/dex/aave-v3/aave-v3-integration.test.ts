import dotenv from 'dotenv';
dotenv.config();

import { DummyDexHelper } from '../../dex-helper/index';
import { Network, SwapSide } from '../../constants';
import { AaveV3 } from './aave-v3';
import {
  checkConstantPoolPrices,
  checkPoolsLiquidity,
} from '../../../tests/utils';
import { Tokens } from '../../../tests/constants-e2e';
import { getTokenFromASymbol } from './tokens';
import { BI_POWS } from '../../bigint-constants';

const network = Network.POLYGON;
const TokenASymbol = 'USDT';
const TokenA = Tokens[network][TokenASymbol];

const TokenBSymbol = 'aUSDT';
const TokenB = getTokenFromASymbol(network, TokenBSymbol);

const amounts = [0n, BI_POWS[6], 2000000n];

const dexKey = 'AaveV3';

describe('AaveV3', function () {
  if (TokenA) {
    if (TokenB) {
      it('getPoolIdentifiers and getPricesVolume SELL', async function () {
        const dexHelper = new DummyDexHelper(network);
        const blocknumber = await dexHelper.web3Provider.eth.getBlockNumber();
        const aaveV3 = new AaveV3(network, dexKey, dexHelper);

        const pools = await aaveV3.getPoolIdentifiers(
          TokenA,
          TokenB,
          SwapSide.SELL,
          blocknumber,
        );
        console.log(
          `${TokenASymbol} <> ${TokenBSymbol} Pool Identifiers: `,
          pools,
        );

        expect(pools.length).toBeGreaterThan(0);

        const poolPrices = await aaveV3.getPricesVolume(
          TokenA,
          TokenB,
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
        checkConstantPoolPrices(poolPrices!, amounts, dexKey);
      });

      it('getPoolIdentifiers and getPricesVolume BUY', async function () {
        const dexHelper = new DummyDexHelper(network);
        const blocknumber = await dexHelper.web3Provider.eth.getBlockNumber();
        const aaveV3 = new AaveV3(network, dexKey, dexHelper);

        const pools = await aaveV3.getPoolIdentifiers(
          TokenA,
          TokenB,
          SwapSide.BUY,
          blocknumber,
        );
        console.log(
          `${TokenASymbol} <> ${TokenBSymbol} Pool Identifiers: `,
          pools,
        );

        expect(pools.length).toBeGreaterThan(0);

        const poolPrices = await aaveV3.getPricesVolume(
          TokenA,
          TokenB,
          amounts,
          SwapSide.BUY,
          blocknumber,
          pools,
        );
        console.log(
          '${TokenASymbol} <> ${TokenBSymbol} Pool Prices: ',
          poolPrices,
        );

        expect(poolPrices).not.toBeNull();
        checkConstantPoolPrices(poolPrices!, amounts, dexKey);
      });
    } else expect(TokenB).not.toBeNull();

    it('getTopPoolsForToken', async function () {
      const dexHelper = new DummyDexHelper(network);
      const aaveV3 = new AaveV3(network, dexKey, dexHelper);

      const poolLiquidity = await aaveV3.getTopPoolsForToken(
        TokenA.address,
        10,
      );
      console.log(`${TokenASymbol} Top Pools:`, poolLiquidity);

      checkPoolsLiquidity(poolLiquidity, TokenA.address, dexKey);
    });
  } else expect(TokenA).not.toBe(undefined);
});
