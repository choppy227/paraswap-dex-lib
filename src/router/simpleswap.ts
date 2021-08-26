import { IRouter } from './irouter';
import {
  Address,
  Adapters,
  OptimalRate,
  ConstractSimpleData,
  TxInfo,
  SimpleExchangeParam,
} from '../types';
import { SwapSide } from '../constants';
import IParaswapABI from '../abi/IParaswap.json';
import { Interface } from '@ethersproject/abi';
import { isETHAddress, uuidToBytes16 } from '../utils';
import { IWethDepositorWithdrawer, Weth, WethFunctions } from '../dex/weth';
import { OptimalSwap } from 'paraswap-core';
import { DexAdapterService } from '../dex';

type SimpleSwapParam = [ConstractSimpleData];

type PartialContractSimpleData = Pick<
  ConstractSimpleData,
  'callees' | 'exchangeData' | 'values' | 'startIndexes'
>;

export class SimpleSwap implements IRouter<SimpleSwapParam> {
  paraswapInterface: Interface;
  contractMethodName: string;

  constructor(
    protected dexAdapterService: DexAdapterService,
    adapters: Adapters,
  ) {
    this.paraswapInterface = new Interface(IParaswapABI);
    this.contractMethodName = 'simpleSwap';
  }

  getContractMethodName(): string {
    return this.contractMethodName;
  }

  private buildPartialContractSimpleData(
    simpleExchangeParam: SimpleExchangeParam,
  ): PartialContractSimpleData {
    const calldata = simpleExchangeParam.calldata;
    let exchangeData = '0x';
    let startIndexes = [0];

    for (let i = 0; i < calldata.length; i++) {
      const tempCalldata = calldata[i].substring(2);
      const index = tempCalldata.length / 2;
      startIndexes.push(startIndexes[i] + index);
      exchangeData = exchangeData.concat(tempCalldata);
    }

    return {
      callees: simpleExchangeParam.callees,
      values: simpleExchangeParam.values,
      exchangeData,
      startIndexes,
    };
  }

  async build(
    priceRoute: OptimalRate,
    minMaxAmount: string,
    userAddress: Address,
    partnerAddress: Address,
    partnerFeePercent: string,
    beneficiary: Address,
    permit: string,
    deadline: string,
    uuid: string,
  ): Promise<TxInfo<SimpleSwapParam>> {
    if (
      priceRoute.bestRoute.length !== 1 ||
      priceRoute.bestRoute[0].percent !== 100 ||
      priceRoute.bestRoute[0].swaps.length !== 1
    )
      throw new Error(`Simpleswap invalid bestRoute`);
    const swap = priceRoute.bestRoute[0].swaps[0];

    const wethAddress = Weth.getAddress(priceRoute.network);

    const rawSimpleParams = await Promise.all(
      swap.swapExchanges.map(async se => {
        const dex = this.dexAdapterService.getDexByKey(se.exchange);
        let _src = swap.srcToken;
        let wethDeposit = BigInt(0);
        let _dest = swap.destToken;
        let wethWithdraw = BigInt(0);

        if (dex.needWrapNative) {
          if (isETHAddress(swap.srcToken)) {
            _src = wethAddress;
            wethDeposit = BigInt(se.srcAmount);
          }

          if (isETHAddress(swap.destToken)) {
            _dest = wethAddress;
            wethWithdraw = BigInt(se.destAmount);
          }
        }
        const simpleParams = await dex.getSimpleParam(
          _src,
          _dest,
          se.srcAmount,
          se.destAmount,
          se.data,
          SwapSide.SELL,
        );

        return {
          simpleParams,
          wethDeposit,
          wethWithdraw,
        };
      }),
    );

    const {
      simpleExchangeDataList,
      srcAmountWethToDeposit,
      destAmountWethToWithdraw,
    } = await rawSimpleParams.reduce<{
      simpleExchangeDataList: SimpleExchangeParam[];
      srcAmountWethToDeposit: bigint;
      destAmountWethToWithdraw: bigint;
    }>(
      (acc, se) => {
        acc.srcAmountWethToDeposit += BigInt(se.wethDeposit);
        acc.destAmountWethToWithdraw += BigInt(se.wethWithdraw);
        acc.simpleExchangeDataList.push(se.simpleParams);
        return acc;
      },
      {
        simpleExchangeDataList: [],
        srcAmountWethToDeposit: BigInt(0),
        destAmountWethToWithdraw: BigInt(0),
      },
    );

    const simpleExchangeDataFlat = simpleExchangeDataList.reduce(
      (acc, se) => ({
        callees: acc.callees.concat(se.callees),
        calldata: acc.calldata.concat(se.calldata),
        values: acc.values.concat(se.values),
        networkFee: (BigInt(acc.networkFee) + BigInt(se.networkFee)).toString(),
      }),
      { callees: [], values: [], calldata: [], networkFee: '0' },
    );

    const maybeWethCallData = this.getDepositWithdrawWethCallData(
      srcAmountWethToDeposit,
      destAmountWethToWithdraw,
      swap,
    );

    if (maybeWethCallData) {
      if (maybeWethCallData.opType === WethFunctions.deposit) {
        simpleExchangeDataFlat.callees.unshift(maybeWethCallData.callee);
        simpleExchangeDataFlat.values.unshift(maybeWethCallData.value);
        simpleExchangeDataFlat.calldata.unshift(maybeWethCallData.calldata);
      } else {
        simpleExchangeDataFlat.callees.push(maybeWethCallData.callee);
        simpleExchangeDataFlat.values.push(maybeWethCallData.value);
        simpleExchangeDataFlat.calldata.push(maybeWethCallData.calldata);
      }
    }

    const partialContractSimpleData = this.buildPartialContractSimpleData(
      simpleExchangeDataFlat,
    );

    const sellData: ConstractSimpleData = {
      ...partialContractSimpleData,
      fromToken: priceRoute.srcToken,
      toToken: priceRoute.destToken,
      fromAmount: priceRoute.srcAmount,
      toAmount: minMaxAmount,
      expectedAmount: priceRoute.destAmount,
      beneficiary,
      partner: partnerAddress,
      feePercent: partnerFeePercent,
      permit,
      deadline,
      uuid: uuidToBytes16(uuid),
    };

    const encoder = (...params: any[]) =>
      this.paraswapInterface.encodeFunctionData('simpleSwap', params);
    // TODO: fix network fee
    return {
      encoder,
      params: [sellData],
      networkFee: simpleExchangeDataFlat.networkFee,
    };
  }

  getDepositWithdrawWethCallData(
    srcAmountWeth: bigint,
    destAmountWeth: bigint,
    swap: OptimalSwap,
  ) {
    if (srcAmountWeth === BigInt('0') && destAmountWeth === BigInt('0')) return;

    return (
      this.dexAdapterService.getDexByKey(
        'weth',
      ) as unknown as IWethDepositorWithdrawer
    ).getDepositWithdrawParam(
      swap.srcToken,
      swap.destToken,
      srcAmountWeth.toString(),
      destAmountWeth.toString(),
      SwapSide.SELL,
    );
  }
}
