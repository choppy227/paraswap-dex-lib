import {
  Token,
  Address,
  ExchangePrices,
  AdapterExchangeParam,
  SimpleExchangeParam,
  PoolLiquidity,
  Logger,
} from '../../types';
import { SwapSide, Network } from '../../constants';
import { getDexKeysWithNetwork, isETHAddress } from '../../utils';
import { IDex } from '../../dex/idex';
import { IDexHelper } from '../../dex-helper/idex-helper';
import {
  WethData,
  WethFunctions,
  DexParams,
  IWethDepositorWithdrawer,
  DepositWithdrawData,
  DepositWithdrawReturn,
} from './types';
import { SimpleExchange } from '../simple-exchange';
import { Adapters, WethConfig } from './config';
import { BI_POWS } from '../../bigint-constants';

export class Weth
  extends SimpleExchange
  implements IDex<WethData, DexParams>, IWethDepositorWithdrawer
{
  readonly hasConstantPriceLargeAmounts = true;

  public static dexKeysWithNetwork: { key: string; networks: Network[] }[] =
    getDexKeysWithNetwork(WethConfig);

  readonly address: Address;

  logger: Logger;

  constructor(
    protected network: Network,
    protected dexKey: string,
    protected dexHelper: IDexHelper,
    protected adapters = Adapters[network] || {},
    protected unitPrice = BI_POWS[18],
    protected poolGasCost = WethConfig[dexKey][network].poolGasCost,
  ) {
    super(dexHelper.config.data.augustusAddress, dexHelper.web3Provider);
    this.address = dexHelper.config.data.wrappedNativeTokenAddress;
    this.logger = dexHelper.getLogger(dexKey);
  }

  isWETH(tokenAddress: Address) {
    return this.address.toLowerCase() === tokenAddress.toLowerCase();
  }

  getAdapters(side: SwapSide): { name: string; index: number }[] | null {
    return this.adapters[side] || null;
  }

  async getPoolIdentifiers(
    srcToken: Token,
    destToken: Token,
    side: SwapSide,
    blockNumber: number,
  ): Promise<string[]> {
    if (isETHAddress(srcToken.address) && this.isWETH(destToken.address)) {
      return [`${this.network}_${destToken.address}`];
    } else if (
      this.isWETH(srcToken.address) &&
      isETHAddress(destToken.address)
    ) {
      return [`${this.network}_${srcToken.address}`];
    } else {
      return [];
    }
  }

  async getPricesVolume(
    srcToken: Token,
    destToken: Token,
    amounts: bigint[],
    side: SwapSide,
    blockNumber: number,
    limitPools?: string[],
  ): Promise<null | ExchangePrices<WethData>> {
    const isWETHSwap =
      (isETHAddress(srcToken.address) && this.isWETH(destToken.address)) ||
      (this.isWETH(srcToken.address) && isETHAddress(destToken.address));

    if (!isWETHSwap) return null;

    return [
      {
        prices: amounts,
        unit: this.unitPrice,
        gasCost: this.poolGasCost,
        exchange: this.dexKey,
        poolAddresses: [this.address],
        data: null,
      },
    ];
  }

  getAdapterParam(
    srcToken: string,
    destToken: string,
    srcAmount: string,
    destAmount: string,
    data: WethData,
    side: SwapSide,
  ): AdapterExchangeParam {
    return {
      targetExchange: this.address,
      payload: '0x',
      networkFee: '0',
    };
  }

  async getSimpleParam(
    srcToken: string,
    destToken: string,
    srcAmount: string,
    destAmount: string,
    data: WethData,
    side: SwapSide,
  ): Promise<SimpleExchangeParam> {
    const swapData = isETHAddress(srcToken)
      ? this.erc20Interface.encodeFunctionData(WethFunctions.deposit)
      : this.erc20Interface.encodeFunctionData(WethFunctions.withdraw, [
          srcAmount,
        ]);

    return this.buildSimpleParamWithoutWETHConversion(
      srcToken,
      srcAmount,
      destToken,
      destAmount,
      swapData,
      this.address,
    );
  }

  async getTopPoolsForToken(
    tokenAddress: Address,
    limit: number,
  ): Promise<PoolLiquidity[]> {
    return [];
  }

  getDepositWithdrawParam(
    srcAmount: string,
    destAmount: string,
    side: SwapSide,
  ): DepositWithdrawReturn {
    const wethToken = this.address;

    let deposit: DepositWithdrawData | undefined;
    let withdraw: DepositWithdrawData | undefined;

    let needWithdraw = false;

    if (srcAmount !== '0') {
      const opType = WethFunctions.deposit;
      const depositWethData = this.erc20Interface.encodeFunctionData(opType);

      deposit = {
        callee: wethToken,
        calldata: depositWethData,
        value: srcAmount,
      };

      if (side === SwapSide.BUY) needWithdraw = true;
    }

    if (needWithdraw || destAmount !== '0') {
      const opType = WethFunctions.withdrawAllWETH;
      const withdrawWethData = this.simpleSwapHelper.encodeFunctionData(
        opType,
        [wethToken],
      );

      withdraw = {
        callee: this.augustusAddress,
        calldata: withdrawWethData,
        value: '0',
      };
    }

    return { deposit, withdraw };
  }
}
