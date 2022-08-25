export const SYNTHETIX_GAS_COST_WITH_SUSD = 480_000;
export const SYNTHETIX_GAS_COST_WITHOUT_SUSD = 680_000;

export enum Contracts {
  SYNTHETIX = 'Synthetix',
  EXCHANGER = 'Exchanger',
  EXCHANGE_RATES = 'ExchangeRates',
  SYSTEM_STATUS = 'SystemStatus',
}

// Encoded lookups in the flexible contract
export const EXCHANGE_RATES_CONTRACT_NAME = 'ExchangeRates';
export const SETTING_CONTRACT_NAME = 'SystemSettings';

export const SETTING_DEX_PRICE_AGGREGATOR = 'dexPriceAggregator';
export const SETTING_ATOMIC_TWAP_WINDOW = 'atomicTwapWindow';
export const SETTING_ATOMIC_EXCHANGE_FEE_RATE = 'atomicExchangeFeeRate';
export const SETTING_EXCHANGE_FEE_RATE = 'exchangeFeeRate';
export const SETTING_PURE_CHAINLINK_PRICE_FOR_ATOMIC_SWAPS_ENABLED =
  'pureChainlinkForAtomicsEnabled';
export const SETTING_ATOMIC_EQUIVALENT_FOR_DEX_PRICING =
  'atomicEquivalentForDexPricing';
export const SETTING_EXCHANGE_DYNAMIC_FEE_THRESHOLD =
  'exchangeDynamicFeeThreshold';
export const SETTING_EXCHANGE_DYNAMIC_FEE_WEIGHT_DECAY =
  'exchangeDynamicFeeWeightDecay';
export const SETTING_EXCHANGE_DYNAMIC_FEE_ROUNDS = 'exchangeDynamicFeeRounds';
export const SETTING_EXCHANGE_MAX_DYNAMIC_FEE = 'exchangeMaxDynamicFee';

// Once for every 24 hours
export const ONCHAIN_CONFIG_VALUE_UPDATE_FREQUENCY_IN_MS = 1000 * 60 * 60 * 24;
