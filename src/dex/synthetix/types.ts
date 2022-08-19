import { Address, Token } from '../../types';

export type LatestRoundData = {
  answer: bigint;
  updatedAt: number;
};

export type Slot0 = {
  tick: bigint;
  observationIndex: bigint;
  observationCardinality: bigint;
};

export type PoolKey = { token0: Address; token1: Address; fee: bigint };

export type OracleObservation = {
  blockTimestamp: bigint;
  tickCumulative: bigint;
  secondsPerLiquidityCumulativeX128: bigint;
  initialized: boolean;
};

export type TokenWithCurrencyKey = Token & { currencyKey?: string };

export type DexPriceAggregatorWithoutOracleState = {
  // from DexPriceAggregatorUniswapV3 instance
  weth: Address;
  defaultPoolFee: bigint;
  uniswapV3Factory: Address;
  // bytes from token0 and token1 ->
  overriddenPoolForRoute: Record<string, Address>;
};

export type PoolState = {
  // currencyKey -> value. From flexibleStorage
  atomicExchangeFeeRate: Record<string, bigint>;
  exchangeFeeRate: Record<string, bigint>;
  pureChainlinkPriceForAtomicSwapsEnabled: Record<string, boolean>;
  atomicEquivalentForDexPricing: Record<string, Token>;

  // currencyKey -> value. From chainLinkRequest
  aggregators: Record<string, LatestRoundData>;

  // from flexible Storage
  atomicTwapWindow: bigint;

  dexPriceAggregator: DexPriceAggregatorWithoutOracleState & {
    // UniswapV3 Pool
    uniswapV3Slot0: Record<string, Slot0>;
    // poolAddress -> observationIndex -> Observation
    uniswapV3Observations: Record<string, Record<number, OracleObservation>>;
    // poolAddress -> tickCumulatives. Taken from [twapWindow, 1n]
    // To pass readonly type check the latest value is in object
    tickCumulatives: Record<string, Record<0 | 1, bigint>>;
  };
  blockTimestamp: bigint;
};

export type OnchainConfigValues = Pick<
  PoolState,
  | 'atomicExchangeFeeRate'
  | 'exchangeFeeRate'
  | 'pureChainlinkPriceForAtomicSwapsEnabled'
  | 'atomicEquivalentForDexPricing'
  | 'atomicTwapWindow'
> & {
  lastUpdatedInMs: number;

  synthetixAddress: Address;
  exchangerAddress: Address;
  dexPriceAggregatorAddress: Address;

  addressToKey: Record<Address, string>;

  dexPriceAggregator: DexPriceAggregatorWithoutOracleState;
  poolKeys: PoolKey[];
  aggregatorsAddresses: Record<string, string>;
};

export type SynthetixData = {
  // TODO: SynthetixData is the dex data that is
  // returned by the API that can be used for
  // tx building. The data structure should be minimal.
  // Complete me!
  exchange: Address;
};

export type DexParams = {
  readProxyAddressResolver: Address;
  flexibleStorage: Address;

  // List of available synths for atomic swap
  synths: Address[];
};
