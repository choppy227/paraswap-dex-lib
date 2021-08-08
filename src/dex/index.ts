import { JsonRpcProvider } from '@ethersproject/providers';
import { Address } from '../types';
import { Curve } from './curve';
import { CurveV2 } from './curve-v2';
import { DirectFunctions, IDex } from './idex';
import { StablePool } from './stable-pool';
import { UniswapV2 } from './uniswap-v2';
import { UniswapV2Fork } from './uniswap-v2-fork';
import { Weth } from './weth';
import { ZeroX } from './zerox';
import { UniswapV3 } from './uniswap-v3';
import { Balancer } from './balancer';
import { Bancor } from './bancor';
import { BProtocol } from './bProtocol';
import { MStable } from './mStable';
import { Shell } from './shell';
import { Onebit } from './onebit';
import { Compound } from './compound';
import { AaveV1 } from './aave-v1';
import { AaveV2 } from './aave-v2';
import { OneInchLp } from './OneInchLp';
import { DodoV1 } from './dodo-v1';
import { DodoV2 } from './dodo-v2';

const DexAdapters = [
  UniswapV2,
  Curve,
  CurveV2,
  StablePool,
  UniswapV2Fork,
  ZeroX,
  Weth,
  Balancer,
  Bancor,
  BProtocol,
  MStable,
  Shell,
  Onebit,
  Compound,
  AaveV1,
  AaveV2,
  OneInchLp,
  DodoV1,
  DodoV2,
  UniswapV3,
  Weth,
];

const isWithDirectFunctionName = (
  DexAdapter: any,
): DexAdapter is { getDirectFunctionName: () => DirectFunctions } => {
  return !!DexAdapter?.getDirectFunctionName?.();
};

export class DexAdapterService {
  dexToKeyMap: {
    [key: string]: new (
      augustusAddress: Address,
      network: number,
      provider: JsonRpcProvider,
    ) => IDex<any, any>;
  };
  directFunctionsNames: string[] = ['swapOnZeroXv2', 'swapOnZeroXv4']; // FIXME: ugly handle better
  dexInstances: { [key: string]: IDex<any, any> } = {};
  constructor(
    private augustusAddress: string,
    private provider: JsonRpcProvider,
    private network: number,
  ) {
    this.dexToKeyMap = DexAdapters.reduce<{
      [exchangeName: string]: new (
        augustusAddress: Address,
        network: number,
        provider: JsonRpcProvider,
      ) => IDex<any, any>;
    }>((acc, DexAdapter) => {
      DexAdapter.dexKeys.forEach(exchangeName => {
        acc[exchangeName.toLowerCase()] = DexAdapter;
      });

      return acc;
    }, {});

    this.directFunctionsNames = this.directFunctionsNames
      .concat(
        DexAdapters.filter(isWithDirectFunctionName).flatMap(DexAdapter => {
          if (!isWithDirectFunctionName(DexAdapter)) return ''; // filter doesn't seem to suffice to TS compiler
          const directFunctionName = DexAdapter.getDirectFunctionName();

          return [directFunctionName.sell || '', directFunctionName.buy || ''];
        }),
      )
      .filter(x => !!x)
      .map(v => v.toLowerCase());
  }

  getDexByKey(dexKey: string): IDex<any, any> {
    const network = this.network;
    let _dexKey = dexKey.toLowerCase();

    if (/^paraswappool(.*)/i.test(_dexKey)) _dexKey = 'zerox';

    if (this.dexInstances[_dexKey]) return this.dexInstances[_dexKey];

    const DexAdapter = this.dexToKeyMap[_dexKey];

    if (!DexAdapter) throw `${dexKey} dex is not supported!`;

    this.dexInstances[_dexKey] = new DexAdapter(
      this.augustusAddress,
      network,
      this.provider,
    );

    return this.dexInstances[_dexKey];
  }

  isDirectFunctionName(functionName: string): boolean {
    return this.directFunctionsNames.includes(functionName.toLowerCase());
  }
}
