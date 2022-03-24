import { Interface, JsonFragment } from '@ethersproject/abi';
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
import { getDexKeysWithNetwork } from '../../utils';
import { IDex } from '../../dex/idex';
import { IDexHelper } from '../../dex-helper/idex-helper';
import { AaveV1Data, AaveV1Param } from './types';
import { SimpleExchange } from '../simple-exchange';
import { AaveV1Config, Adapters } from './config';
import AAVE_LENDING_POOL_ABI_V1 from '../../abi/AaveV1_lending_pool.json';
import ERC20 from '../../abi/erc20.json';
import tokens from './tokens-mainnet.json';

const AaveGasCost = 400 * 1000;

enum AaveV1Functions {
  deposit = 'deposit',
  redeem = 'redeem',
}

const AAVE_LENDING_POOL = '0x398eC7346DcD622eDc5ae82352F02bE94C62d119';
const AAVE_PROXY = '0x3dfd23a6c5e8bbcfc9581d2e864a68feb6a076d3';
const REF_CODE = 1;

export class AaveV1
  extends SimpleExchange
  implements IDex<AaveV1Data, AaveV1Param>
{
  readonly hasConstantPriceLargeAmounts = false;

  public static dexKeysWithNetwork: { key: string; networks: Network[] }[] =
    getDexKeysWithNetwork(AaveV1Config);

  logger: Logger;
  aavePool: Interface;
  aContract: Interface;

  private lendingTokensAddresses = new Set<string>();
  constructor(
    protected network: Network,
    protected dexKey: string,
    protected dexHelper: IDexHelper, // TODO: add any additional optional params to support other fork DEXes
  ) {
    super(dexHelper.augustusAddress, dexHelper.provider);
    this.logger = dexHelper.getLogger(dexKey);
    this.aavePool = new Interface(AAVE_LENDING_POOL_ABI_V1 as JsonFragment[]);
    this.aContract = new Interface(ERC20 as JsonFragment[]);
    if (network == Network.MAINNET) {
      tokens.forEach((token: Token) => {
        this.lendingTokensAddresses.add(token.address);
      });
    }
  }

  // Initialize pricing is called once in the start of
  // pricing service. It is intended to setup the integration
  // for pricing requests. It is optional for a DEX to
  // implement this function
  async initializePricing(blockNumber: number) {}

  // Returns the list of contract adapters (name and index)
  // for a buy/sell. Return null if there are no adapters.
  getAdapters(side: SwapSide): { name: string; index: number }[] | null {
    return Adapters[this.network][side];
  }

  // Returns list of pool identifiers that can be used
  // for a given swap. poolIdentifers must be unique
  // across DEXes. It is recommended to use
  // ${dexKey}_${poolAddress} as a poolIdentifier
  async getPoolIdentifiers(
    srcToken: Token,
    destToken: Token,
    side: SwapSide,
    blockNumber: number,
  ): Promise<string[]> {
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
  ): Promise<null | ExchangePrices<AaveV1Data>> {
    const fromAToken = this.lendingTokensAddresses.has(
      srcToken.address.toLowerCase(),
    );
    return [
      {
        prices: amounts,
        unit: BigInt(
          10 ** (side === SwapSide.SELL ? destToken : srcToken).decimals,
        ),
        gasCost: AaveGasCost,
        exchange: this.dexKey,
        data: {
          fromAToken,
          isV2: false,
        },
        poolAddresses: [fromAToken ? srcToken.address : destToken.address],
      },
    ];
  }

  // Encode params required by the exchange adapter
  // Used for multiSwap, buy & megaSwap
  // Hint: abiCoder.encodeParameter() couls be useful
  getAdapterParam(
    srcToken: string,
    destToken: string,
    srcAmount: string,
    destAmount: string,
    data: AaveV1Data,
    side: SwapSide,
  ): AdapterExchangeParam {
    const aToken = data.fromAToken ? srcToken : destToken; // Warning
    const payload = this.abiCoder.encodeParameter(
      {
        ParentStruct: {
          aToken: 'address',
        },
      },
      { aToken },
    );

    return {
      targetExchange: AAVE_LENDING_POOL,
      payload,
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
    data: AaveV1Data,
    side: SwapSide,
  ): Promise<SimpleExchangeParam> {
    const [Interface, swapFunction, swapFunctionParams, swapCallee, spender] =
      ((): [Interface, AaveV1Functions, AaveV1Param, Address, Address?] => {
        if (data.fromAToken) {
          return [
            this.aContract,
            AaveV1Functions.redeem,
            [srcAmount],
            srcToken,
          ];
        }

        return [
          this.aavePool,
          AaveV1Functions.deposit,
          [srcToken, srcAmount, REF_CODE],
          AAVE_LENDING_POOL,
          AAVE_PROXY, // warning
        ];
      })();

    const swapData = Interface.encodeFunctionData(
      swapFunction,
      swapFunctionParams,
    );

    return this.buildSimpleParamWithoutWETHConversion(
      srcToken,
      srcAmount,
      destToken,
      destAmount,
      swapData,
      swapCallee,
      spender,
    );
  }

  // This is called once before getTopPoolsForToken is
  // called for multiple tokens. This can be helpful to
  // update common state required for calculating
  // getTopPoolsForToken. It is optional for a DEX
  // to implement this
  updatePoolState(): Promise<void> {
    return Promise.resolve();
  }

  // Returns list of top pools based on liquidity. Max
  // limit number pools should be returned.
  async getTopPoolsForToken(
    tokenAddress: Address,
    limit: number,
  ): Promise<PoolLiquidity[]> {
    return [];
  }
}
