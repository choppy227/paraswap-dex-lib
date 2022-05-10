import dotenv from 'dotenv';
dotenv.config();

import { testE2E } from '../../../tests/utils-e2e';
import {
  Tokens,
  Holders,
  NativeTokenSymbols,
} from '../../../tests/constants-e2e';
import {
  Network,
  ProviderURL,
  ContractMethod,
  SwapSide,
} from '../../constants';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

describe('WooFi E2E', () => {
  const dexKey = 'WooFi';

  describe('WooFi BSC', () => {
    const network = Network.BSC;
    const tokens = Tokens[network];
    const holders = Holders[network];
    const provider = new StaticJsonRpcProvider(ProviderURL[network], network);

    const tokenASymbol: string = 'WBNB';
    const tokenBSymbol: string = 'USDT';
    const nativeTokenSymbol = NativeTokenSymbols[network];

    const tokenAAmount: string = '3000000000000000000';
    const tokenBAmount: string = '111000000000000000000';
    const nativeTokenAmount = '3000000000000000000';

    const sideToContractMethods = new Map([
      [
        SwapSide.SELL,
        [
          ContractMethod.simpleSwap,
          ContractMethod.multiSwap,
          ContractMethod.megaSwap,
        ],
      ],
    ]);

    sideToContractMethods.forEach((contractMethods, side) =>
      contractMethods.forEach((contractMethod: ContractMethod) => {
        describe(`${contractMethod}`, () => {
          it(nativeTokenSymbol + ' -> QUOTE TOKEN', async () => {
            await testE2E(
              tokens[nativeTokenSymbol],
              tokens[tokenBSymbol],
              holders[nativeTokenSymbol],
              side === SwapSide.SELL ? nativeTokenAmount : tokenBAmount,
              side,
              dexKey,
              contractMethod,
              network,
              provider,
            );
          });
          it('QUOTE TOKEN -> ' + nativeTokenSymbol, async () => {
            await testE2E(
              tokens[tokenBSymbol],
              tokens[nativeTokenSymbol],
              holders[tokenBSymbol],
              side === SwapSide.SELL ? tokenBAmount : nativeTokenAmount,
              side,
              dexKey,
              contractMethod,
              network,
              provider,
            );
          });
          it('BASE TOKEN -> QUOTE TOKEN', async () => {
            await testE2E(
              tokens[tokenASymbol],
              tokens[tokenBSymbol],
              holders[tokenASymbol],
              side === SwapSide.SELL ? tokenAAmount : tokenBAmount,
              side,
              dexKey,
              contractMethod,
              network,
              provider,
            );
          });
          it('QUOTE TOKEN -> BASE TOKEN', async () => {
            await testE2E(
              tokens[tokenBSymbol],
              tokens[tokenASymbol],
              holders[tokenBSymbol],
              side === SwapSide.SELL ? tokenBAmount : tokenAAmount,
              side,
              dexKey,
              contractMethod,
              network,
              provider,
            );
          });
        });
      }),
    );
  });
});
