import dotenv from 'dotenv';
dotenv.config();

import { testE2E } from '../../../tests/utils-e2e';
import { Tokens, Holders } from '../../../tests/constants-e2e';
import {
  Network,
  ProviderURL,
  ContractMethod,
  SwapSide,
} from '../../constants';
import { JsonRpcProvider } from '@ethersproject/providers';

describe('UniswapV2 E2E Ropsten', () => {
  const dexKey = 'UniswapV2';
  const network = Network.ROPSTEN;
  const tokens = Tokens[network];
  const holders = Holders[network];
  const provider = new JsonRpcProvider(ProviderURL[network], network);

  describe('SimpleSwap', () => {
    it('ETH -> TOKEN', async () => {
      await testE2E(
        tokens.ETH,
        tokens.DAI,
        holders.ETH,
        '1000000000000000000',
        SwapSide.SELL,
        dexKey,
        ContractMethod.simpleSwap,
        network,
        provider,
      );
    });
    it('TOKEN -> ETH', async () => {
      await testE2E(
        tokens.DAI,
        tokens.ETH,
        holders.DAI,
        '400000000000000000000',
        SwapSide.SELL,
        dexKey,
        ContractMethod.simpleSwap,
        network,
        provider,
      );
    });
    it('TOKEN -> TOKEN', async () => {
      await testE2E(
        tokens.WETH,
        tokens.DAI,
        holders.WETH,
        '1000000000000000000',
        SwapSide.SELL,
        dexKey,
        ContractMethod.simpleSwap,
        network,
        provider,
      );
    });
  });

  describe('MultiSwap', () => {
    it('ETH -> TOKEN', async () => {
      await testE2E(
        tokens.ETH,
        tokens.DAI,
        holders.ETH,
        '1000000000000000000',
        SwapSide.SELL,
        dexKey,
        ContractMethod.multiSwap,
        network,
        provider,
      );
    });
    it('TOKEN -> ETH', async () => {
      await testE2E(
        tokens.DAI,
        tokens.ETH,
        holders.DAI,
        '400000000000000000000',
        SwapSide.SELL,
        dexKey,
        ContractMethod.multiSwap,
        network,
        provider,
      );
    });
    it('TOKEN -> TOKEN', async () => {
      await testE2E(
        tokens.WETH,
        tokens.DAI,
        holders.WETH,
        '1000000000000000000',
        SwapSide.SELL,
        dexKey,
        ContractMethod.multiSwap,
        network,
        provider,
      );
    });
  });

  describe('MegaSwap', () => {
    it('ETH -> TOKEN', async () => {
      await testE2E(
        tokens.ETH,
        tokens.DAI,
        holders.ETH,
        '1000000000000000000',
        SwapSide.SELL,
        dexKey,
        ContractMethod.megaSwap,
        network,
        provider,
      );
    });
    it('TOKEN -> ETH', async () => {
      await testE2E(
        tokens.DAI,
        tokens.ETH,
        holders.DAI,
        '400000000000000000000',
        SwapSide.SELL,
        dexKey,
        ContractMethod.megaSwap,
        network,
        provider,
      );
    });
    it('TOKEN -> TOKEN', async () => {
      await testE2E(
        tokens.WETH,
        tokens.DAI,
        holders.WETH,
        '1000000000000000000',
        SwapSide.SELL,
        dexKey,
        ContractMethod.megaSwap,
        network,
        provider,
      );
    });
  });

  describe('SimpleBuy', () => {
    it('ETH -> TOKEN', async () => {
      await testE2E(
        tokens.ETH,
        tokens.DAI,
        holders.ETH,
        '400000000000000000000',
        SwapSide.BUY,
        dexKey,
        ContractMethod.simpleBuy,
        network,
        provider,
      );
    });
    it('TOKEN -> ETH', async () => {
      await testE2E(
        tokens.DAI,
        tokens.ETH,
        holders.DAI,
        '1000000000000000000',
        SwapSide.BUY,
        dexKey,
        ContractMethod.simpleBuy,
        network,
        provider,
      );
    });
    it('TOKEN -> TOKEN', async () => {
      await testE2E(
        tokens.WETH,
        tokens.DAI,
        holders.WETH,
        '400000000000000000000',
        SwapSide.BUY,
        dexKey,
        ContractMethod.simpleBuy,
        network,
        provider,
      );
    });
  });

  describe('BuyMethod', () => {
    it('ETH -> TOKEN', async () => {
      await testE2E(
        tokens.ETH,
        tokens.DAI,
        holders.ETH,
        '400000000000000000000',
        SwapSide.BUY,
        dexKey,
        ContractMethod.buy,
        network,
        provider,
      );
    });
    it('TOKEN -> ETH', async () => {
      await testE2E(
        tokens.DAI,
        tokens.ETH,
        holders.DAI,
        '1000000000000000000',
        SwapSide.BUY,
        dexKey,
        ContractMethod.buy,
        network,
        provider,
      );
    });
    it('TOKEN -> TOKEN', async () => {
      await testE2E(
        tokens.WETH,
        tokens.DAI,
        holders.WETH,
        '400000000000000000000',
        SwapSide.BUY,
        dexKey,
        ContractMethod.buy,
        network,
        provider,
      );
    });
  });

  describe('DirectSwapOnUniswapV2Fork', () => {
    it('ETH -> TOKEN', async () => {
      await testE2E(
        tokens.ETH,
        tokens.DAI,
        holders.ETH,
        '1000000000000000000',
        SwapSide.SELL,
        dexKey,
        ContractMethod.swapOnUniswapV2Fork,
        network,
        provider,
      );
    });
    it('TOKEN -> ETH', async () => {
      await testE2E(
        tokens.DAI,
        tokens.ETH,
        holders.DAI,
        '400000000000000000000',
        SwapSide.SELL,
        dexKey,
        ContractMethod.swapOnUniswapV2Fork,
        network,
        provider,
      );
    });
    it('TOKEN -> TOKEN', async () => {
      await testE2E(
        tokens.WETH,
        tokens.DAI,
        holders.WETH,
        '1000000000000000000',
        SwapSide.SELL,
        dexKey,
        ContractMethod.swapOnUniswapV2Fork,
        network,
        provider,
      );
    });
  });

  describe('DirectBuyOnUniswapV2Fork', () => {
    it('ETH -> TOKEN', async () => {
      await testE2E(
        tokens.ETH,
        tokens.DAI,
        holders.ETH,
        '400000000000000000000',
        SwapSide.BUY,
        dexKey,
        ContractMethod.buyOnUniswapV2Fork,
        network,
        provider,
      );
    });
    it('TOKEN -> ETH', async () => {
      await testE2E(
        tokens.DAI,
        tokens.ETH,
        holders.DAI,
        '1000000000000000000',
        SwapSide.BUY,
        dexKey,
        ContractMethod.buyOnUniswapV2Fork,
        network,
        provider,
      );
    });
    it('TOKEN -> TOKEN', async () => {
      await testE2E(
        tokens.WETH,
        tokens.DAI,
        holders.WETH,
        '400000000000000000000',
        SwapSide.BUY,
        dexKey,
        ContractMethod.buyOnUniswapV2Fork,
        network,
        provider,
      );
    });
  });
});
