import { Interface, JsonFragment } from '@ethersproject/abi';
import { SwapSide } from '../constants';
import { AdapterExchangeParam, Address, SimpleExchangeParam } from '../types';
import { IDex } from './idex';
import { SimpleExchange } from './simple-exchange';
import MStableAssetABI from '../abi/MStableAsset.json';
import MStablePoolABI from '../abi/MStablePool.json';

enum MStableFunctions {
  mint = 'mint',
  swap = 'swap',
  redeem = 'redeem',
}
type MStableData = {
  exchange: string;
  opType: MStableFunctions;
  isAssetContract: boolean;
};
type MStableMint = [
  _input: string,
  _inputQuantity: string,
  _minOutputQuantity: string,
  _recipient: string,
];
type MStableSwap = [
  _input: string,
  _output: string,
  _inputQuantity: string,
  _minOutputQuantity: string,
  _recipient: string,
];
type MStableRedeem = [
  _output: string,
  _mAssetQuantity: string,
  _minOutputQuantity: string,
  _recipient: string,
];

type MStableParam = MStableMint | MStableSwap | MStableRedeem;

export class MStable
  extends SimpleExchange
  implements IDex<MStableData, MStableParam>
{
  protected dexKeys = ['mStable'];
  mStableAsset: Interface;
  mStablePool: Interface;

  constructor(augustusAddress: Address, private network: number) {
    super(augustusAddress);
    this.mStableAsset = new Interface(MStableAssetABI as JsonFragment[]);
    this.mStablePool = new Interface(MStablePoolABI as JsonFragment[]);
  }

  getAdapterParam(
    srcToken: string,
    destToken: string,
    srcAmount: string,
    destAmount: string,
    data: MStableData,
    side: SwapSide,
  ): AdapterExchangeParam {
    const { opType } = data;
    const type = [
      MStableFunctions.swap,
      MStableFunctions.mint,
      MStableFunctions.redeem,
    ].indexOf(opType);

    if (type === undefined) {
      throw new Error(
        `mStable: Invalid OpType ${opType}, Should be one of ['mint', 'swap', 'redeem']`,
      );
    }

    const payload = this.abiCoder.encodeParameter(
      {
        ParentStruct: {
          opType: 'uint',
        },
      },
      {
        opType: type,
      },
    );

    return {
      targetExchange: data.exchange,
      payload,
      networkFee: '0',
    };
  }

  getSimpleParam(
    srcToken: string,
    destToken: string,
    srcAmount: string,
    destAmount: string,
    data: MStableData,
    side: SwapSide,
  ): SimpleExchangeParam {
    const { opType, isAssetContract } = data;

    const [swapFunction, swapFunctionsParams] = ((): [
      MStableFunctions,
      MStableParam,
    ] => {
      switch (opType) {
        case MStableFunctions.mint:
          return [
            opType,
            [srcToken, srcAmount, destAmount, this.augustusAddress],
          ];
        case MStableFunctions.swap:
          return [
            opType,
            [srcToken, destToken, srcAmount, destAmount, this.augustusAddress],
          ];
        case MStableFunctions.redeem:
          return [
            opType,
            [destToken, srcAmount, destAmount, this.augustusAddress],
          ];
        default:
          throw `mStable's OpType ${opType} not supported, failed to build`;
      }
    })();

    const swapData = (
      isAssetContract ? this.mStableAsset : this.mStablePool
    ).encodeFunctionData(swapFunction, swapFunctionsParams);

    return this.buildSimpleParamWithoutWETHConversion(
      srcToken,
      srcAmount,
      destToken,
      destAmount,
      swapData,
      data.exchange,
    );
  }
}
