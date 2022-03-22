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
import {
  getDexKeysWithNetwork,
  isETHAddress,
  WethMap,
  isWETH,
} from '../../utils';
import { IDex } from '../../dex/idex';
import { IDexHelper } from '../../dex-helper/idex-helper';
import {
  WethData,
  WethFunctions,
  DexParams,
  IWethDepositorWithdrawer,
  DepositWithdrawReturn,
} from './types';
import { SimpleExchange } from '../simple-exchange';
import { Adapters, WethConfig } from './config';

export class Weth
  extends SimpleExchange
  implements IDex<WethData, DexParams>, IWethDepositorWithdrawer
{
  readonly hasConstantPriceLargeAmounts = true;

  public static dexKeysWithNetwork: { key: string; networks: Network[] }[] =
    getDexKeysWithNetwork(WethConfig);

  public static getAddress(network: number = 1): Address {
    return WethMap[network];
  }

  logger: Logger;

  constructor(
    protected network: Network,
    protected dexKey: string,
    protected dexHelper: IDexHelper,
    protected adapters = Adapters[network] || {},
    protected unitPrice = BigInt(1e18),
    protected poolGasCost = WethConfig[dexKey][network].poolGasCost,
  ) {
    super(dexHelper.augustusAddress, dexHelper.provider);
    this.logger = dexHelper.getLogger(dexKey);
  }

  // Returns the list of contract adapters (name and index)
  // for a buy/sell. Return null if there are no adapters.
  getAdapters(side: SwapSide): { name: string; index: number }[] | null {
    return this.adapters[side] || null;
  }

  // Returns list of pool identifiers that can be used
  // for a given swap. poolIdentifiers must be unique
  // across DEXes. It is recommended to use
  // ${dexKey}_${poolAddress} as a poolIdentifier
  async getPoolIdentifiers(
    srcToken: Token,
    destToken: Token,
    side: SwapSide,
    blockNumber: number,
  ): Promise<string[]> {
    if (srcToken.address.toLowerCase() === destToken.address.toLowerCase()) {
      return [];
    }

    const tokenAddress = [
      srcToken.address.toLowerCase(),
      destToken.address.toLowerCase(),
    ]
      .sort((a, b) => (a > b ? 1 : -1))
      .join('_');

    const poolIdentifier = `${this.dexKey}_${tokenAddress}`;
    return [poolIdentifier];
  }

  // Returns pool prices for amounts.
  // If limitPools is defined only pools in limitPools
  // should be used. If limitPools is undefined then
  // any pools can be used.
  async getPricesVolume(
    srcToken: Token,
    destToken: Token,
    amounts: bigint[],
    side: SwapSide,
    blockNumber: number,
    limitPools?: string[],
  ): Promise<null | ExchangePrices<WethData>> {
    const isWETHSwap =
      (isETHAddress(srcToken.address) &&
        isWETH(destToken.address, this.network)) ||
      (isWETH(srcToken.address, this.network) &&
        isETHAddress(destToken.address));

    if (!isWETHSwap) return null;

    return [
      {
        prices: amounts,
        unit: this.unitPrice,
        gasCost: this.poolGasCost,
        exchange: this.dexKey,
        poolAddresses: [Weth.getAddress(this.network)],
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
      targetExchange: Weth.getAddress(this.network),
      payload: '0x',
      networkFee: '0',
    };
  }

  // Encode call data used by simpleSwap like routers
  // Used for simpleSwap & simpleBuy
  // Hint: this.buildSimpleParamWithoutWETHConversion
  // could be useful
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
      Weth.getAddress(this.network),
    );
  }

  // This is called once before getTopPoolsForToken is
  // called for multiple tokens. This can be helpful to
  // update common state required for calculating
  // getTopPoolsForToken. It is optional for a DEX
  // to implement this
  async updatePoolState(): Promise<void> {}

  // Returns list of top pools based on liquidity. Max
  // limit number pools should be returned.
  async getTopPoolsForToken(
    tokenAddress: Address,
    limit: number,
  ): Promise<PoolLiquidity[]> {
    return [];
  }

  getDepositWithdrawParam(
    srcToken: string,
    destToken: string,
    srcAmount: string,
    destAmount: string,
    side: SwapSide,
  ): DepositWithdrawReturn | undefined {
    const wethToken = Weth.getAddress(this.network);

    if (srcAmount !== '0' && isETHAddress(srcToken)) {
      const opType = WethFunctions.deposit;
      const depositWethData = this.erc20Interface.encodeFunctionData(opType);

      return {
        opType,
        callee: wethToken,
        calldata: depositWethData,
        value: srcAmount,
      };
    }

    if (destAmount !== '0' && isETHAddress(destToken)) {
      const opType = WethFunctions.withdrawAllWETH;
      const withdrawWethData = this.simpleSwapHelper.encodeFunctionData(
        opType,
        [wethToken],
      );

      return {
        opType,
        callee: this.augustusAddress,
        calldata: withdrawWethData,
        value: '0',
      };
    }
  }
}
