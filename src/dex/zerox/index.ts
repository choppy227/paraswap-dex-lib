import { AbiEncoder } from '@0x/utils';
import { Interface } from '@ethersproject/abi';

import IParaswapAbi from '../../abi/IParaswap.json';
import ZRX_V2_ABI from '../../abi/zrx.v2.json';
import ZRX_V3_ABI from '../../abi/zrx.v3.json';
import ZRX_V4_ABI from '../../abi/zrx.v4.json';

import { SwapSide } from '../../constants';
import { SimpleExchange } from '../simple-exchange';
import { ZeroXOrder } from './order';

import type { IDexTxBuilder } from '../idex';
import type {
  AdapterExchangeParam,
  Address,
  NumberAsString,
  SimpleExchangeParam,
  TxInfo,
} from '../../types';
import type {
  ZeroXSignedOrder,
  ZeroXSignedOrderV2,
  ZeroXSignedOrderV4,
} from './types';
import Web3 from 'web3';

const ZRX_EXCHANGE: any = {
  1: {
    2: '0x080bf510fcbf18b91105470639e9561022937712',
    3: '0x61935CbDd02287B511119DDb11Aeb42F1593b7Ef',
    4: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
  },
  56: {
    2: '0x3F93C3D9304a70c9104642AB8cD37b1E2a7c203A',
    4: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
  },
  137: {
    4: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
  },
};

const ZRX_ABI: any = {
  2: ZRX_V2_ABI,
  3: ZRX_V3_ABI,
  4: ZRX_V4_ABI,
};

const ZRX_EXCHANGE_ERC20PROXY: any = {
  1: {
    1: '0x95E6F48254609A6ee006F7D493c8e5fB97094ceF',
    2: '0x95E6F48254609A6ee006F7D493c8e5fB97094ceF',
    4: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
  },
  56: {
    2: '0xCF21d4b7a265FF779accBA55Ace0F56C8cE6e379',
    4: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
  },
  137: {
    4: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
  },
};

enum ZeroXFunctions {
  swapOnZeroXv2 = 'swapOnZeroXv2',
  swapOnZeroXv4 = 'swapOnZeroXv4',
  swapOnZeroXv2WithPermit = 'swapOnZeroXv2WithPermit',
  swapOnZeroXv4WithPermit = 'swapOnZeroXv4WithPermit',
}

type ZeroXData = {
  version: number;
  order: ZeroXSignedOrder;
};

type SwapOnZeroXParam = [
  srcToken: Address,
  destToken: Address,
  srcAmount: NumberAsString,
  destAmount: NumberAsString,
  exchange: Address,
  payload: string,
];
type SwapOnZeroXWithPermitParam = [
  srcToken: Address,
  destToken: Address,
  srcAmount: NumberAsString,
  destAmount: NumberAsString,
  exchange: Address,
  payload: string,
  permit: string,
];

type ZeroXParam = SwapOnZeroXParam | SwapOnZeroXWithPermitParam;

export class ZeroX
  extends SimpleExchange
  implements IDexTxBuilder<ZeroXData, ZeroXParam>
{
  static dexKeys = ['zerox'];
  routerInterface: Interface;
  needWrapNative = true;

  constructor(
    augustusAddress: Address,
    public network: number,
    provider: Web3,
  ) {
    super(augustusAddress, provider);
    this.routerInterface = new Interface(IParaswapAbi);
  }

  private getExchange(data: ZeroXData) {
    return ZRX_EXCHANGE[this.network][data.version];
  }

  protected buildSimpleSwapData(data: ZeroXData, srcAmount: NumberAsString) {
    const zrxABI = ZRX_ABI[data.version];
    const signature = data.order.signature;
    const order = ZeroXOrder.formatOrders(data.order, data.version);

    const methodAbi = zrxABI.find(
      (m: any) =>
        m.name ===
        (data.version === 4 ? 'fillRfqOrder' : 'marketSellOrdersNoThrow'),
    );

    const abiEncoder = new AbiEncoder.Method(methodAbi);
    // TODO: fillLimitOrder only accepts one order, find something that can accept multiple orders
    return abiEncoder.encode(
      data.version === 4
        ? [order, signature, srcAmount]
        : [[order], srcAmount, [signature]],
    );
  }

  protected buildPayload(data: ZeroXData) {
    const payload =
      data.version === 4
        ? this.abiCoder.encodeParameter(
            {
              ParentStruct: {
                order: {
                  makerToken: 'address',
                  takerToken: 'address',
                  makerAmount: 'uint128',
                  takerAmount: 'uint128',
                  maker: 'address',
                  taker: 'address',
                  txOrigin: 'address',
                  pool: 'bytes32',
                  expiry: 'uint64',
                  salt: 'uint256',
                },
                signature: {
                  signatureType: 'uint8',
                  v: 'uint8',
                  r: 'bytes32',
                  s: 'bytes32',
                },
              },
            },
            {
              order: ZeroXOrder.formatOrders(data.order, 4),
              signature: data.order.signature,
            },
          )
        : this.abiCoder.encodeParameter(
            {
              ParentStruct: {
                'orders[]': {
                  makerAddress: 'address', // Address that created the order.
                  takerAddress: 'address', // Address that is allowed to fill the order. If set to 0, any address is allowed to fill the order.
                  feeRecipientAddress: 'address', // Address that will receive fees when order is filled.
                  senderAddress: 'address', // Address that is allowed to call Exchange contract methods that affect this order. If set to 0, any address is allowed to call these methods.
                  makerAssetAmount: 'uint256', // Amount of makerAsset being offered by maker. Must be greater than 0.
                  takerAssetAmount: 'uint256', // Amount of takerAsset being bid on by maker. Must be greater than 0.
                  makerFee: 'uint256', // Fee paid to feeRecipient by maker when order is filled.
                  takerFee: 'uint256', // Fee paid to feeRecipient by taker when order is filled.
                  expirationTimeSeconds: 'uint256', // Timestamp in seconds at which order expires.
                  salt: 'uint256', // Arbitrary number to facilitate uniqueness of the order's hash.
                  makerAssetData: 'bytes', // Encoded data that can be decoded by a specified proxy contract when transferring makerAsset. The leading bytes4 references the id of the asset proxy.
                  takerAssetData: 'bytes',
                },
                signatures: 'bytes[]',
              },
            },
            {
              orders: [ZeroXOrder.formatOrders(data.order, 2)],
              signatures: [data.order.signature],
            },
          );
    return payload;
  }

  getAdapterParam(
    srcToken: Address,
    destToken: Address,
    srcAmount: NumberAsString,
    toAmount: NumberAsString, // required for buy case
    data: ZeroXData,
    side: SwapSide,
  ): AdapterExchangeParam {
    return {
      targetExchange: this.getExchange(data),
      payload: this.buildPayload(data),
      networkFee: '0',
    };
  }

  async getSimpleParam(
    src: Address,
    dest: Address,
    srcAmount: NumberAsString,
    destAmount: NumberAsString,
    data: ZeroXData,
    side: SwapSide,
  ): Promise<SimpleExchangeParam> {
    if (side === SwapSide.BUY) {
      // Adjust the srcAmount according to the exact order price (rounding up)
      if (data.version === 4) {
        const order = data.order as ZeroXSignedOrderV4;
        if (BigInt(destAmount) > BigInt(order.makerAmount)) {
          throw new Error(
            `ZeroX destAmount ${destAmount} > makerAmount ${order.makerAmount}`,
          );
        }
        const calc =
          (BigInt(destAmount) * BigInt(order.takerAmount) +
            BigInt(order.makerAmount) -
            1n) /
          BigInt(order.makerAmount);
        if (calc > BigInt(srcAmount)) {
          throw new Error(`ZeroX calc ${calc} > srcAmount ${srcAmount}`);
        }
        srcAmount = calc.toString();
      } else {
        const order = data.order as ZeroXSignedOrderV2;
        if (BigInt(destAmount) > BigInt(order.makerAssetAmount)) {
          throw new Error(
            `ZeroX destAmount ${destAmount} > makerAmount ${order.makerAssetAmount}`,
          );
        }
        const calc =
          (BigInt(destAmount) * BigInt(order.takerAssetAmount) +
            BigInt(order.makerAssetAmount) -
            1n) /
          BigInt(order.makerAssetAmount);
        if (calc > BigInt(srcAmount)) {
          throw new Error(`ZeroX calc ${calc} > srcAmount ${srcAmount}`);
        }
        srcAmount = calc.toString();
      }
    }
    const swapData = this.buildSimpleSwapData(data, srcAmount);
    const networkFees = '0';

    return this.buildSimpleParamWithoutWETHConversion(
      src,
      srcAmount,
      dest,
      destAmount,
      swapData,
      this.getExchange(data),
      ZRX_EXCHANGE_ERC20PROXY[this.network][data.version],
      networkFees,
    );
  }

  getDirectParam(
    srcToken: Address,
    destToken: Address,
    srcAmount: NumberAsString,
    destAmount: NumberAsString,
    data: ZeroXData,
    side: SwapSide,
    permit: string,
  ): TxInfo<ZeroXParam> {
    const usePermit = permit !== '0x';
    const encoder = (...params: ZeroXParam) => {
      switch (data.version) {
        case 2:
          return this.routerInterface.encodeFunctionData(
            usePermit
              ? ZeroXFunctions.swapOnZeroXv2WithPermit
              : ZeroXFunctions.swapOnZeroXv2,
            params,
          );
        case 4:
          return this.routerInterface.encodeFunctionData(
            usePermit
              ? ZeroXFunctions.swapOnZeroXv4WithPermit
              : ZeroXFunctions.swapOnZeroXv4,
            params,
          );
        default:
          throw new Error(`ZeroX version ${data.version} is not supported!`);
      }
    };
    return {
      params: usePermit
        ? [
            srcToken,
            destToken,
            srcAmount,
            destAmount,
            this.getExchange(data),
            this.buildPayload(data),
            permit,
          ]
        : [
            srcToken,
            destToken,
            srcAmount,
            destAmount,
            this.getExchange(data),
            this.buildPayload(data),
          ],
      encoder,
      networkFee: '0',
    };
  }

  static getDirectFunctionName(): string[] {
    return [ZeroXFunctions.swapOnZeroXv2, ZeroXFunctions.swapOnZeroXv4];
  }
}
