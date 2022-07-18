import { ethers } from 'ethers';
import { Interface } from '@ethersproject/abi';
import {
  Token,
  Address,
  ExchangePrices,
  AdapterExchangeParam,
  SimpleExchangeParam,
  PoolLiquidity,
  Logger,
  BigIntAsString,
  OptimalSwapExchange,
  ExchangeTxInfo,
  PreprocessTransactionOptions,
} from '../../types';
import { SwapSide, Network, LIMIT_ORDER_PROVIDERS } from '../../constants';
import { getBigIntPow, getDexKeysWithNetwork } from '../../utils';
import { IDex } from '../../dex/idex';
import { IDexHelper } from '../../dex-helper/idex-helper';
import {
  ParaSwapLimitOrdersData,
  ParaSwapOrderResponse,
  ParaSwapLimitOrderPriceSummary,
  ParaSwapOrderBookResponse,
  OrderInfo,
  ParaSwapOrderBook,
} from './types';
import { ParaSwapLimitOrdersConfig, Adapters } from './config';
import { LimitOrderExchange } from '../limit-order-exchange';
import { BI_MAX_UINT } from '../../bigint-constants';
import augustusRFQABI from '../../abi/paraswap-limit-orders/AugustusRFQ.abi.json';
import {
  MAX_ORDERS_MULTI_FACTOR,
  MAX_ORDERS_USED_FOR_SWAP,
  ONE_ORDER_GASCOST,
} from './constant';
import BigNumber from 'bignumber.js';

export class ParaSwapLimitOrders
  extends LimitOrderExchange<ParaSwapOrderResponse, ParaSwapOrderBookResponse>
  implements IDex<ParaSwapLimitOrdersData>
{
  readonly hasConstantPriceLargeAmounts = false;
  readonly needWrapNative = true;

  public static dexKeysWithNetwork: { key: string; networks: Network[] }[] =
    getDexKeysWithNetwork(ParaSwapLimitOrdersConfig);

  logger: Logger;

  constructor(
    protected network: Network,
    protected dexKey: string,
    protected dexHelper: IDexHelper,
    protected adapters = Adapters[network] ? Adapters[network] : {},
    protected augustusRFQAddress = ParaSwapLimitOrdersConfig[dexKey][
      network
    ].rfqAddress.toLowerCase(),
    protected rfqIface = new Interface(augustusRFQABI),
  ) {
    super(dexHelper.config.data.augustusAddress, dexHelper.web3Provider);
    this.logger = dexHelper.getLogger(dexKey);
  }

  get limitOrderProviderName() {
    return LIMIT_ORDER_PROVIDERS.PARASWAP;
  }

  getAdapters(side: SwapSide): { name: string; index: number }[] | null {
    return this.adapters[side] ? this.adapters[side] : null;
  }

  getIdentifier(srcToken: Address, destToken: Address) {
    // Expected lowered Addresses
    return `${this.dexKey.toLowerCase()}_${srcToken}_${destToken}`;
  }

  async getPoolIdentifiers(
    srcToken: Token,
    destToken: Token,
    side: SwapSide,
    blockNumber: number,
  ): Promise<string[]> {
    const _srcToken = this.dexHelper.config.wrapETH(srcToken);
    const _destToken = this.dexHelper.config.wrapETH(destToken);

    const _srcAddress = _srcToken.address.toLowerCase();
    const _destAddress = _destToken.address.toLowerCase();

    if (_srcAddress === _destAddress) {
      return [];
    }

    const orderBook = await this._getLatestOrderBook(_srcAddress, _destAddress);

    if (orderBook === null) return [];

    return [this.getIdentifier(_srcAddress, _destAddress)];
  }

  async getPricesVolume(
    srcToken: Token,
    destToken: Token,
    amounts: bigint[],
    side: SwapSide,
    blockNumber: number,
    limitPools?: string[],
  ): Promise<null | ExchangePrices<ParaSwapLimitOrdersData>> {
    try {
      const _srcToken = this.dexHelper.config.wrapETH(srcToken);
      const _destToken = this.dexHelper.config.wrapETH(destToken);

      const _srcAddress = _srcToken.address.toLowerCase();
      const _destAddress = _destToken.address.toLowerCase();

      if (_srcAddress === _destAddress) return null;

      const expectedIdentifier = this.getIdentifier(_srcAddress, _destAddress);

      if (
        limitPools !== undefined &&
        !limitPools.some(p => p === expectedIdentifier)
      )
        return null;

      const isSell = side === SwapSide.SELL;
      const unitVolume = getBigIntPow(
        isSell ? _srcToken.decimals : _destToken.decimals,
      );

      let orderBook = await this._getLatestOrderBook(_srcAddress, _destAddress);

      if (orderBook === null) return null;

      // Unit is volume is not increasing, so better to request separate
      let {
        prices: [unit],
      } = this._getPrices([unitVolume], orderBook, isSell);

      const { prices, gasCosts } = this._getPrices(amounts, orderBook, isSell);

      if (unit === 0n) {
        // If we didn't fulfill unit amount, scale up latest amount till unit
        unit = (unitVolume * prices.slice(-1)[0]) / amounts.slice(-1)[0];
      }

      return [
        {
          unit,
          prices,
          data: { orderInfos: null },
          poolIdentifier: expectedIdentifier,
          exchange: this.dexKey,
          gasCost: gasCosts.map(v => Number(v)),
          poolAddresses: [this.augustusRFQAddress],
        },
      ];
    } catch (e) {
      this.logger.error(
        `Error_getPricesVolume ${this.dexKey}: ${
          srcToken.symbol || srcToken.address
        }, ${destToken.symbol || destToken.address}, ${side}:`,
        e,
      );
      return null;
    }
  }

  async preProcessTransaction?(
    optimalSwapExchange: OptimalSwapExchange<ParaSwapLimitOrdersData>,
    srcToken: Token,
    destToken: Token,
    side: SwapSide,
    options: PreprocessTransactionOptions,
  ): Promise<[OptimalSwapExchange<ParaSwapLimitOrdersData>, ExchangeTxInfo]> {
    const userAddress = options.txOrigin;

    const srcWrapped = this.dexHelper.config
      .wrapETH(srcToken)
      .address.toLowerCase();
    const destWrapped = this.dexHelper.config
      .wrapETH(destToken)
      .address.toLowerCase();

    const isSell = side === SwapSide.SELL;
    const amountWithSlippage = isSell
      ? BigInt(
          new BigNumber(optimalSwapExchange.destAmount.toString())
            .times(options.slippageFactor)
            .toFixed(0),
        )
      : BigInt(
          options.slippageFactor
            .times(optimalSwapExchange.srcAmount.toString())
            .toFixed(0),
        );

    const { encodingValues, minDeadline } =
      await this._prepareOrdersForTransaction(
        srcWrapped,
        destWrapped,
        isSell ? optimalSwapExchange.srcAmount : amountWithSlippage.toString(),
        isSell ? amountWithSlippage.toString() : optimalSwapExchange.destAmount,
        side,
        userAddress,
      );

    return [
      {
        ...optimalSwapExchange,
        data: { orderInfos: encodingValues },
      },
      { deadline: minDeadline },
    ];
  }

  getTokenFromAddress?(address: Address): Token {
    // We don't have predefined set of tokens with decimals
    // Anyway we don't use decimals, so it is fine to do this
    return { address, decimals: 0 };
  }

  getAdapterParam(
    srcToken: string,
    destToken: string,
    srcAmount: string,
    destAmount: string,
    data: ParaSwapLimitOrdersData,
    side: SwapSide,
  ): AdapterExchangeParam {
    const { orderInfos } = data;
    if (orderInfos === null) {
      throw new Error(
        `Error_${this.dexKey}_getAdapterParam payload is not received. It may be because of` +
          `not calling preProcessTransaction before`,
      );
    }

    const isSell = side === SwapSide.SELL;
    const orderInfoParamType = this.rfqIface.getFunction(
      isSell ? 'tryBatchFillOrderTakerAmount' : 'tryBatchFillOrderMakerAmount',
    ).inputs[0];

    const orderInfoTypes = orderInfoParamType.format(
      ethers.utils.FormatTypes.full,
    );

    const payload = this.rfqIface._abiCoder.encode(
      [`tuple(${orderInfoTypes})`],
      [{ orderInfos }],
    );

    return {
      targetExchange: this.augustusRFQAddress,
      payload,
      networkFee: '0',
    };
  }

  async getSimpleParam(
    srcToken: string,
    destToken: string,
    srcAmount: string,
    destAmount: string,
    data: ParaSwapLimitOrdersData,
    side: SwapSide,
  ): Promise<SimpleExchangeParam> {
    const { orderInfos } = data;

    if (orderInfos === null) {
      throw new Error(
        `Error_${this.dexKey}_getAdapterParam payload is not received. It may be because of` +
          `not calling preProcessTransaction before`,
      );
    }

    const isSell = side === SwapSide.SELL;
    const swapData = this.rfqIface.encodeFunctionData(
      isSell ? 'tryBatchFillOrderTakerAmount' : 'tryBatchFillOrderMakerAmount',
      [orderInfos, isSell ? srcAmount : destAmount, this.augustusAddress],
    );

    return this.buildSimpleParamWithoutWETHConversion(
      srcToken,
      srcAmount,
      destToken,
      destAmount,
      swapData,
      this.augustusRFQAddress,
    );
  }

  async getTopPoolsForToken(
    tokenAddress: Address,
    limit: number,
  ): Promise<PoolLiquidity[]> {
    return [];
  }

  private async _getLatestOrderBook(
    src: Address,
    dest: Address,
  ): Promise<ParaSwapOrderBook[] | null> {
    const orderBookUnparsed = await this._limitOrderProvider!.fetchOrderBook(
      this.network,
      src,
      dest,
    );

    if (orderBookUnparsed === null || orderBookUnparsed.length === 0) {
      this.logger.trace(
        `${this.dexKey}: No orderBook found for ${src} and ${dest} on ${this.network} network`,
      );
      return null;
    }

    return orderBookUnparsed
      .map(orderBook => ({
        swappableMakerBalance: BigInt(orderBook.swappableMakerBalance),
        swappableTakerBalance: BigInt(orderBook.swappableTakerBalance),
        makerAmount: BigInt(orderBook.makerAmount),
        takerAmount: BigInt(orderBook.takerAmount),
        isFillOrKill: orderBook.isFillOrKill,
      }))
      .filter(
        orderBook =>
          orderBook.swappableMakerBalance > 0n &&
          orderBook.swappableTakerBalance > 0n,
      );
  }

  private async _prepareOrdersForTransaction(
    srcToken: Address,
    destToken: Address,
    srcAmount: BigIntAsString,
    destAmount: BigIntAsString,
    side: SwapSide,
    userAddress: Address,
  ): Promise<{
    encodingValues: OrderInfo[];
    minDeadline: bigint;
  }> {
    // I assume that srcToken and destToken are already wrapped
    // And received orders are fully match the amount we need and the price
    // without further checks and calculations
    const orderInfos = await this._limitOrderProvider!.fetchAndReserveOrders(
      this.network,
      srcToken,
      destToken,
      srcAmount,
      destAmount,
      side,
      userAddress,
    );

    if (orderInfos === null)
      throw new Error(
        `${
          this.dexKey
        }: No orders received from _limitOrderProvider fetchAndReserveOrders request with params: ${JSON.stringify(
          {
            network: this.network,
            srcToken,
            destToken,
            srcAmount,
            destAmount,
            side,
            userAddress,
          },
        )}`,
      );

    const encodingValues: OrderInfo[] = new Array(orderInfos.length);

    let minDeadline = BI_MAX_UINT;
    for (const [i, orderInfo] of orderInfos.entries()) {
      // Find minimum deadline value
      const { order } = orderInfo;

      const orderExpiryBigInt = BigInt(order.expiry);
      minDeadline =
        orderExpiryBigInt < minDeadline ? orderExpiryBigInt : minDeadline;

      encodingValues[i] = {
        order: {
          nonceAndMeta: order.nonceAndMeta,
          expiry: order.expiry,
          makerAsset: order.makerAsset,
          takerAsset: order.takerAsset,
          maker: order.maker,
          taker: order.taker,
          makerAmount: order.makerAmount,
          takerAmount: order.takerAmount,
        },
        signature: orderInfo.signature,
        takerTokenFillAmount: orderInfo.takerTokenFillAmount,
        permitTakerAsset: orderInfo.permitTakerAsset
          ? orderInfo.permitTakerAsset
          : '0x',
        permitMakerAsset: orderInfo.permitMakerAsset
          ? orderInfo.permitMakerAsset
          : '0x',
      };
    }
    return { encodingValues, minDeadline };
  }

  private _getPrices(
    amounts: bigint[],
    orderBook: ParaSwapOrderBook[],
    isSell: boolean,
  ): { prices: bigint[]; gasCosts: bigint[] } {
    const prices = new Array<bigint>(amounts.length).fill(0n);
    const gasCosts = new Array<bigint>(amounts.length).fill(0n);

    const calcOutFunc = isSell
      ? this._calcMakerFromTakerAmount
      : this._calcTakerFromMakerAmount;

    const srcKeyAmount = isSell
      ? 'swappableTakerBalance'
      : 'swappableMakerBalance';
    const destKeyAmount = isSell
      ? 'swappableMakerBalance'
      : 'swappableTakerBalance';

    const orderThresholdDenominators = [
      BigInt(MAX_ORDERS_USED_FOR_SWAP) * BigInt(MAX_ORDERS_MULTI_FACTOR),
      BigInt(MAX_ORDERS_USED_FOR_SWAP),
    ];

    for (const orderThresholdDenominator of orderThresholdDenominators) {
      let latestFilteredOrderBook = orderBook;
      for (const [i, amount] of amounts.entries()) {
        if (!(prices[i] === 0n && gasCosts[i] === 0n)) {
          // We don't want to recalculate prices if previous iterations succeeded
          continue;
        }

        if (amount === 0n) {
          prices[i] = 0n;
          gasCosts[i] = 0n;
          continue;
        }

        const amountThreshold = amount / orderThresholdDenominator;

        latestFilteredOrderBook = latestFilteredOrderBook.filter(
          ob => ob[srcKeyAmount] >= amountThreshold,
        );

        if (latestFilteredOrderBook.length === 0) {
          prices[i] = 0n;
          gasCosts[i] = 0n;
          continue;
        }

        let toFill = amount;
        let numberOfOrders = 0n;
        let filled = 0n;

        for (const order of latestFilteredOrderBook) {
          if (toFill > 0n) {
            if (toFill > order[srcKeyAmount]) {
              toFill -= order[srcKeyAmount];
              filled += order[destKeyAmount];
              numberOfOrders++;
            } else if (order.isFillOrKill) {
              continue;
            } else {
              filled += calcOutFunc(
                toFill,
                order.makerAmount,
                order.takerAmount,
              );
              toFill = 0n;
              numberOfOrders++;
            }
          }
          if (numberOfOrders >= MAX_ORDERS_USED_FOR_SWAP) {
            break;
          }
        }

        if (numberOfOrders > MAX_ORDERS_USED_FOR_SWAP) {
          prices[i] = 0n;
          gasCosts[i] = 0n;
        } else if (toFill === 0n) {
          prices[i] = filled;
          gasCosts[i] = numberOfOrders * ONE_ORDER_GASCOST;
        } else {
          prices[i] = 0n;
          gasCosts[i] = 0n;
        }
      }
    }
    return { prices, gasCosts };
  }

  private _calcTakerFromMakerAmount(
    swappableMakerAmount: bigint,
    makerAmount: bigint,
    takerAmount: bigint,
  ): bigint {
    return (
      (swappableMakerAmount * takerAmount + (makerAmount - 1n)) / makerAmount
    );
  }

  private _calcMakerFromTakerAmount(
    swappableTakerAmount: bigint,
    makerAmount: bigint,
    takerAmount: bigint,
  ): bigint {
    return (swappableTakerAmount * makerAmount) / takerAmount;
  }
}
