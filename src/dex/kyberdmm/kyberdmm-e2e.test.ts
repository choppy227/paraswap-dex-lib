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
import { JsonRpcProvider } from '@ethersproject/providers';

describe('KyberDmm E2E', () => {
  const dexKey = 'KyberDmm';

  describe('KyberDmm MAINNET', () => {
    const network = Network.MAINNET;
    const tokens = Tokens[network];
    const holders = Holders[network];
    const provider = new JsonRpcProvider(ProviderURL[network]);

    const tokenASymbol: string = 'USDT';
    const tokenBSymbol: string = 'WBTC';
    const nativeTokenSymbol = NativeTokenSymbols[network];

    const tokenAAmount: string = '2000000';
    const tokenBAmount: string = '200000000';
    const nativeTokenAmount = '1000000000000000000';

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
          it(nativeTokenSymbol + ' -> TOKEN', async () => {
            await testE2E(
              tokens[nativeTokenSymbol],
              tokens[tokenASymbol],
              holders[nativeTokenSymbol],
              side === SwapSide.SELL ? nativeTokenAmount : tokenAAmount,
              side,
              dexKey,
              contractMethod,
              network,
              provider,
            );
          });
          it('TOKEN -> ' + nativeTokenSymbol, async () => {
            await testE2E(
              tokens[tokenASymbol],
              tokens[nativeTokenSymbol],
              holders[tokenASymbol],
              side === SwapSide.SELL ? tokenAAmount : nativeTokenAmount,
              side,
              dexKey,
              contractMethod,
              network,
              provider,
            );
          });
          it('TOKEN -> TOKEN', async () => {
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
        });
      }),
    );
  });

  // describe('KyberDmm POLYGON', () => {
  //   const network = Network.POLYGON;
  //   const tokens = Tokens[network];
  //   const holders = Holders[network];
  //   const provider = new JsonRpcProvider(ProviderURL[network]);

  //   const tokenASymbol: string = 'USDT';
  //   const tokenBSymbol: string = 'BUSD';
  //   const nativeTokenSymbol = NativeTokenSymbols[network];

  //   const tokenAAmount: string = '700000000000000000000';
  //   const tokenBAmount: string = '700000000000000000000';
  //   const nativeTokenAmount = '7000000000000000000';

  //   const sideToContractMethods = new Map([
  //     [
  //       SwapSide.SELL,
  //       [
  //         ContractMethod.simpleSwap,
  //         ContractMethod.multiSwap,
  //         ContractMethod.megaSwap,
  //       ],
  //     ],
  //   ]);

  //   sideToContractMethods.forEach((contractMethods, side) =>
  //     contractMethods.forEach((contractMethod: ContractMethod) => {
  //       describe(`${contractMethod}`, () => {
  //         it(nativeTokenSymbol + ' -> TOKEN', async () => {
  //           await testE2E(
  //             tokens[nativeTokenSymbol],
  //             tokens[tokenASymbol],
  //             holders[nativeTokenSymbol],
  //             side === SwapSide.SELL ? nativeTokenAmount : tokenAAmount,
  //             side,
  //             dexKey,
  //             contractMethod,
  //             network,
  //             provider,
  //           );
  //         });
  //         it('TOKEN -> ' + nativeTokenSymbol, async () => {
  //           await testE2E(
  //             tokens[tokenASymbol],
  //             tokens[nativeTokenSymbol],
  //             holders[tokenASymbol],
  //             side === SwapSide.SELL ? tokenAAmount : nativeTokenAmount,
  //             side,
  //             dexKey,
  //             contractMethod,
  //             network,
  //             provider,
  //           );
  //         });
  //         it('TOKEN -> TOKEN', async () => {
  //           await testE2E(
  //             tokens[tokenASymbol],
  //             tokens[tokenBSymbol],
  //             holders[tokenASymbol],
  //             side === SwapSide.SELL ? tokenAAmount : tokenBAmount,
  //             side,
  //             dexKey,
  //             contractMethod,
  //             network,
  //             provider,
  //           );
  //         });
  //       });
  //     }),
  //   );
  // });

  // describe('KyberDmm BSC', () => {
  //   const network = Network.BSC;
  //   const tokens = Tokens[network];
  //   const holders = Holders[network];
  //   const provider = new JsonRpcProvider(ProviderURL[network]);

  //   const tokenASymbol: string = 'USDT';
  //   const tokenBSymbol: string = 'BUSD';
  //   const nativeTokenSymbol = NativeTokenSymbols[network];

  //   const tokenAAmount: string = '700000000000000000000';
  //   const tokenBAmount: string = '700000000000000000000';
  //   const nativeTokenAmount = '7000000000000000000';

  //   const sideToContractMethods = new Map([
  //     [
  //       SwapSide.SELL,
  //       [
  //         ContractMethod.simpleSwap,
  //         ContractMethod.multiSwap,
  //         ContractMethod.megaSwap,
  //       ],
  //     ],
  //   ]);

  //   sideToContractMethods.forEach((contractMethods, side) =>
  //     contractMethods.forEach((contractMethod: ContractMethod) => {
  //       describe(`${contractMethod}`, () => {
  //         it(nativeTokenSymbol + ' -> TOKEN', async () => {
  //           await testE2E(
  //             tokens[nativeTokenSymbol],
  //             tokens[tokenASymbol],
  //             holders[nativeTokenSymbol],
  //             side === SwapSide.SELL ? nativeTokenAmount : tokenAAmount,
  //             side,
  //             dexKey,
  //             contractMethod,
  //             network,
  //             provider,
  //           );
  //         });
  //         it('TOKEN -> ' + nativeTokenSymbol, async () => {
  //           await testE2E(
  //             tokens[tokenASymbol],
  //             tokens[nativeTokenSymbol],
  //             holders[tokenASymbol],
  //             side === SwapSide.SELL ? tokenAAmount : nativeTokenAmount,
  //             side,
  //             dexKey,
  //             contractMethod,
  //             network,
  //             provider,
  //           );
  //         });
  //         it('TOKEN -> TOKEN', async () => {
  //           await testE2E(
  //             tokens[tokenASymbol],
  //             tokens[tokenBSymbol],
  //             holders[tokenASymbol],
  //             side === SwapSide.SELL ? tokenAAmount : tokenBAmount,
  //             side,
  //             dexKey,
  //             contractMethod,
  //             network,
  //             provider,
  //           );
  //         });
  //       });
  //     }),
  //   );
  // });

  // describe('KyberDmm AVALANCHE', () => {
  //   const network = Network.AVALANCHE;
  //   const tokens = Tokens[network];
  //   const holders = Holders[network];
  //   const provider = new JsonRpcProvider(ProviderURL[network]);

  //   const tokenASymbol: string = 'USDCe';
  //   const tokenBSymbol: string = 'USDTe';
  //   const nativeTokenSymbol = NativeTokenSymbols[network];

  //   const tokenAAmount: string = '700000000';
  //   const tokenBAmount: string = '700000000';
  //   const nativeTokenAmount = '70000000000000000';

  //   const sideToContractMethods = new Map([
  //     [
  //       SwapSide.SELL,
  //       [
  //         ContractMethod.simpleSwap,
  //         ContractMethod.multiSwap,
  //         ContractMethod.megaSwap,
  //       ],
  //     ],
  //   ]);

  //   sideToContractMethods.forEach((contractMethods, side) =>
  //     contractMethods.forEach((contractMethod: ContractMethod) => {
  //       describe(`${contractMethod}`, () => {
  //         it(nativeTokenSymbol + ' -> TOKEN', async () => {
  //           await testE2E(
  //             tokens[nativeTokenSymbol],
  //             tokens[tokenASymbol],
  //             holders[nativeTokenSymbol],
  //             side === SwapSide.SELL ? nativeTokenAmount : tokenAAmount,
  //             side,
  //             dexKey,
  //             contractMethod,
  //             network,
  //             provider,
  //           );
  //         });
  //         it('TOKEN -> ' + nativeTokenSymbol, async () => {
  //           await testE2E(
  //             tokens[tokenASymbol],
  //             tokens[nativeTokenSymbol],
  //             holders[tokenASymbol],
  //             side === SwapSide.SELL ? tokenAAmount : nativeTokenAmount,
  //             side,
  //             dexKey,
  //             contractMethod,
  //             network,
  //             provider,
  //           );
  //         });
  //         it('TOKEN -> TOKEN', async () => {
  //           await testE2E(
  //             tokens[tokenASymbol],
  //             tokens[tokenBSymbol],
  //             holders[tokenASymbol],
  //             side === SwapSide.SELL ? tokenAAmount : tokenBAmount,
  //             side,
  //             dexKey,
  //             contractMethod,
  //             network,
  //             provider,
  //           );
  //         });
  //       });
  //     }),
  //   );
  // });
});
