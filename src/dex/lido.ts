import { Provider } from '@ethersproject/providers';
import { Interface, JsonFragment } from '@ethersproject/abi';
import { NumberAsString, SwapSide } from 'paraswap-core';
import { AdapterExchangeParam, Address, SimpleExchangeParam } from '../types';
import { IDexTxBuilder } from './idex';
import stETHAbi from '../abi/stETH.json';
import { NULL_ADDRESS } from '../constants';
import Web3 from 'web3';

export const stETH: any = {
  1: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
};

export enum stETHFunctions {
  submit = 'submit',
}

export type LidoData = {};

export class Lido implements IDexTxBuilder<LidoData, any> {
  static dexKeys = ['lido'];
  stETHInterface: Interface;

  needWrapNative = false;

  constructor(
    augustusAddress: Address,
    private network: number,
    provider: Web3,
  ) {
    this.stETHInterface = new Interface(stETHAbi as JsonFragment[]);
  }

  getAdapterParam(
    srcToken: Address,
    destToken: Address,
    srcAmount: NumberAsString,
    destAmount: NumberAsString,
    data: LidoData,
    side: SwapSide,
  ): AdapterExchangeParam {
    return {
      targetExchange: stETH[this.network],
      payload: '0x',
      networkFee: '0',
    };
  }

  async getSimpleParam(
    srcToken: Address,
    destToken: Address,
    srcAmount: NumberAsString,
    destAmount: NumberAsString,
    data: LidoData,
    side: SwapSide,
  ): Promise<SimpleExchangeParam> {
    const swapData = this.stETHInterface.encodeFunctionData(
      stETHFunctions.submit,
      [NULL_ADDRESS],
    );

    return {
      callees: [stETH[this.network]],
      calldata: [swapData],
      values: [srcAmount],
      networkFee: '0',
    };
  }
}
