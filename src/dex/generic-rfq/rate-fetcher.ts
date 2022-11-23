import BigNumber from 'bignumber.js';
import { SwapSide } from 'paraswap-core';
import { BN_1 } from '../../bignumber-constants';
import { IDexHelper } from '../../dex-helper';
import { RequestConfig } from '../../dex-helper/irequest-wrapper';
import Fetcher from '../../lib/fetcher/fetcher';

import { Logger, Address, Token } from '../../types';
import { OrderInfo } from '../paraswap-limit-orders/types';
import { authHttp } from './security';
import {
  BlackListResponse,
  PairMap,
  PairsResponse,
  PriceAndAmount,
  PriceAndAmountBigNumber,
  RatesResponse,
  RFQConfig,
  RFQFirmRateResponse,
  RFQPayload,
  TokensResponse,
  TokenWithInfo,
} from './types';
import { checkOrder } from './utils';
import {
  blacklistResponseValidator,
  firmRateResponseValidator,
  pairsResponseValidator,
  pricesResponse,
  tokensResponseValidator,
  validateAndCast,
} from './validators';

export const reversePrice = (price: PriceAndAmountBigNumber) =>
  [
    BN_1.dividedBy(price[0]),
    price[1].times(price[0]),
  ] as PriceAndAmountBigNumber;

export class RateFetcher {
  private tokensFetcher: Fetcher<TokensResponse>;
  private pairsFetcher: Fetcher<PairsResponse>;
  private rateFetcher: Fetcher<RatesResponse>;
  private blackListFetcher?: Fetcher<BlackListResponse>;

  private tokens: Record<string, TokenWithInfo> = {};
  private addressToTokenMap: Record<string, TokenWithInfo> = {};
  private pairs: PairMap = {};

  private firmRateAuth?: (options: RequestConfig) => void;

  private blackListCacheKey: string;

  constructor(
    private dexHelper: IDexHelper,
    private config: RFQConfig,
    private dexKey: string,
    private logger: Logger,
  ) {
    this.tokensFetcher = new Fetcher<TokensResponse>(
      dexHelper.httpRequest,
      {
        info: {
          requestOptions: config.tokensConfig.reqParams,
          caster: (data: unknown) => {
            return validateAndCast<TokensResponse>(
              data,
              tokensResponseValidator,
            );
          },
          authenticate: authHttp(config.tokensConfig.secret),
        },
        handler: this.handleTokensResponse.bind(this),
      },
      config.tokensConfig.intervalMs,
      this.logger,
    );

    this.pairsFetcher = new Fetcher<PairsResponse>(
      dexHelper.httpRequest,
      {
        info: {
          requestOptions: config.pairsConfig.reqParams,
          caster: (data: unknown) => {
            return validateAndCast<PairsResponse>(data, pairsResponseValidator);
          },
          authenticate: authHttp(config.pairsConfig.secret),
        },
        handler: this.handlePairsResponse.bind(this),
      },
      config.pairsConfig.intervalMs,
      this.logger,
    );

    this.rateFetcher = new Fetcher<RatesResponse>(
      dexHelper.httpRequest,
      {
        info: {
          requestOptions: config.rateConfig.reqParams,
          caster: (data: unknown) => {
            return validateAndCast<RatesResponse>(data, pricesResponse);
          },
          authenticate: authHttp(config.rateConfig.secret),
        },
        handler: this.handleRatesResponse.bind(this),
      },
      config.rateConfig.intervalMs,
      logger,
    );

    if (config.blacklistConfig) {
      this.blackListFetcher = new Fetcher<BlackListResponse>(
        dexHelper.httpRequest,
        {
          info: {
            requestOptions: config.blacklistConfig.reqParams,
            caster: (data: unknown) => {
              return validateAndCast<BlackListResponse>(
                data,
                blacklistResponseValidator,
              );
            },
            authenticate: authHttp(config.rateConfig.secret),
          },
          handler: this.handleBlackListResponse.bind(this),
        },
        config.blacklistConfig.intervalMs,
        logger,
      );
    }

    this.blackListCacheKey = `${this.dexHelper.config.data.network}_${this.dexKey}_blacklist`;
    if (this.config.firmRateConfig.secret) {
      this.firmRateAuth = authHttp(this.config.firmRateConfig.secret);
    }
  }

  start() {
    this.tokensFetcher.startPolling();
    this.pairsFetcher.startPolling();
    if (this.blackListFetcher) {
      this.blackListFetcher.startPolling();
    }
  }

  stop() {
    this.tokensFetcher.stopPolling();
    this.pairsFetcher.stopPolling();
    this.rateFetcher.stopPolling();

    if (this.blackListFetcher) {
      this.blackListFetcher.stopPolling();
    }
  }

  private handleTokensResponse(data: TokensResponse) {
    for (const tokenName of Object.keys(data.tokens)) {
      const token = data.tokens[tokenName];
      token.address = token.address.toLowerCase();
      this.tokens[tokenName] = token;
    }

    this.addressToTokenMap = Object.keys(this.tokens).reduce((acc, key) => {
      const obj = this.tokens[key];
      if (!obj) {
        return acc;
      }
      acc[obj.address.toLowerCase()] = obj;
      return acc;
    }, {} as Record<string, TokenWithInfo>);
  }

  private handlePairsResponse(resp: PairsResponse) {
    this.pairs = {};

    if (this.rateFetcher.isPolling()) {
      this.rateFetcher.stopPolling();
    }

    const pairs: PairMap = {};
    for (const pairName of Object.keys(resp.pairs)) {
      pairs[pairName] = resp.pairs[pairName];
    }

    this.pairs = pairs;
    this.rateFetcher.startPolling();
  }

  private handleBlackListResponse(resp: BlackListResponse) {
    for (const address of resp.blacklist) {
      this.dexHelper.cache.sadd(this.blackListCacheKey, address.toLowerCase());
    }
  }

  public isBlackListed(userAddress: string) {
    return this.dexHelper.cache.sismember(
      this.blackListCacheKey,
      userAddress.toLowerCase(),
    );
  }

  private handleRatesResponse(resp: RatesResponse) {
    const pairs = this.pairs;
    Object.keys(resp.prices).forEach(pairName => {
      const pair = pairs[pairName];
      if (!pair) {
        return;
      }
      const prices = resp.prices[pairName];

      if (!prices.asks || !prices.bids) {
        return;
      }

      const baseToken = this.tokens[pair.base];
      const quoteToken = this.tokens[pair.quote];

      if (!baseToken || !quoteToken) {
        this.logger.warn(`missing base or quote token`);
        return;
      }

      if (prices.bids.length) {
        this.dexHelper.cache.setex(
          this.dexKey,
          this.dexHelper.config.data.network,
          `${baseToken.address}_${quoteToken.address}_bids`,
          this.config.rateConfig.dataTTLS,
          JSON.stringify(prices.bids),
        );
      }

      if (prices.asks.length) {
        this.dexHelper.cache.setex(
          this.dexKey,
          this.dexHelper.config.data.network,
          `${baseToken.address}_${quoteToken.address}_asks`,
          this.config.rateConfig.dataTTLS,
          JSON.stringify(prices.asks),
        );
      }
    });
  }

  checkHealth(): boolean {
    return [this.tokensFetcher, this.rateFetcher].some(
      f => f.lastFetchSucceeded,
    );
  }

  public getPairsLiqudity(tokenAddress: string) {
    const token = this.addressToTokenMap[tokenAddress];

    const pairNames = Object.keys(this.pairs);
    const pairs = Object.values(this.pairs);

    return pairs
      .filter((p, index) => pairNames[index].includes(token.symbol!))
      .map(p => {
        const baseToken = this.tokens[p.base];
        const quoteToken = this.tokens[p.quote];
        let connectorToken: Token | undefined;
        if (baseToken.address !== tokenAddress) {
          connectorToken = {
            address: baseToken.address,
            decimals: baseToken.decimals,
          };
        } else {
          connectorToken = {
            address: quoteToken.address,
            decimals: quoteToken.decimals,
          };
        }
        return {
          connectorTokens: [connectorToken],
          liquidityUSD: p.liquidityUSD,
        };
      });
  }

  public async getOrderPrice(
    srcToken: Token,
    destToken: Token,
    side: SwapSide,
  ): Promise<PriceAndAmountBigNumber[] | null> {
    let reversed = false;

    let pricesAsString: string | null = null;
    if (side === SwapSide.SELL) {
      pricesAsString = await this.dexHelper.cache.get(
        this.dexKey,
        this.dexHelper.config.data.network,
        `${srcToken.address}_${destToken.address}_bids`,
      );

      if (!pricesAsString) {
        pricesAsString = await this.dexHelper.cache.get(
          this.dexKey,
          this.dexHelper.config.data.network,
          `${destToken.address}_${srcToken.address}_asks`,
        );
        reversed = true;
      }
    } else {
      pricesAsString = await this.dexHelper.cache.get(
        this.dexKey,
        this.dexHelper.config.data.network,
        `${destToken.address}_${srcToken.address}_asks`,
      );

      if (!pricesAsString) {
        pricesAsString = await this.dexHelper.cache.get(
          this.dexKey,
          this.dexHelper.config.data.network,
          `${srcToken.address}_${destToken.address}_bids`,
        );
        reversed = true;
      }
    }

    if (!pricesAsString) {
      return null;
    }

    const orderPricesAsString: PriceAndAmount[] = JSON.parse(pricesAsString);
    if (!orderPricesAsString) {
      return null;
    }

    let orderPrices = orderPricesAsString.map(price => [
      new BigNumber(price[0]),
      new BigNumber(price[1]),
    ]);

    if (reversed) {
      orderPrices = orderPrices.map(price =>
        reversePrice(price as PriceAndAmountBigNumber),
      );
    }

    return orderPrices as PriceAndAmountBigNumber[];
  }

  async getFirmRate(
    _srcToken: Token,
    _destToken: Token,
    srcAmount: string,
    side: SwapSide,
    userAddress: Address,
  ): Promise<OrderInfo> {
    const srcToken = this.dexHelper.config.wrapETH(_srcToken);
    const destToken = this.dexHelper.config.wrapETH(_destToken);

    if (BigInt(srcAmount) === 0n) {
      throw new Error('getFirmRate failed with srcAmount == 0');
    }

    const _payload: RFQPayload = {
      makerAsset: destToken.address,
      takerAsset: srcToken.address,
      makerAmount: side === SwapSide.BUY ? srcAmount : undefined,
      takerAmount: side === SwapSide.SELL ? srcAmount : undefined,
      userAddress,
    };

    try {
      let payload = {
        data: _payload,
        ...this.config.firmRateConfig,
      };

      if (this.firmRateAuth) {
        this.firmRateAuth(payload);
        delete payload.secret;
      }

      const { data } = await this.dexHelper.httpRequest.request<unknown>(
        payload,
      );

      const firmRateResp = validateAndCast<RFQFirmRateResponse>(
        data,
        firmRateResponseValidator,
      );

      await checkOrder(
        this.dexHelper.config.data.network,
        this.dexHelper.config.data.augustusRFQAddress,
        this.dexHelper.multiWrapper,
        firmRateResp.order,
      );

      return {
        order: {
          maker: firmRateResp.order.maker,
          taker: firmRateResp.order.taker,
          expiry: firmRateResp.order.expiry,
          nonceAndMeta: firmRateResp.order.nonceAndMeta,
          makerAsset: firmRateResp.order.makerAsset,
          takerAsset: firmRateResp.order.takerAsset,
          makerAmount: firmRateResp.order.makerAmount,
          takerAmount: firmRateResp.order.takerAmount,
        },
        signature: firmRateResp.order.signature,
        takerTokenFillAmount: firmRateResp.order.takerAmount,
        permitMakerAsset: '0x',
        permitTakerAsset: '0x',
      };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}
