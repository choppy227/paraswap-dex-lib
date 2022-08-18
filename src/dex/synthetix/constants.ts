export enum Contracts {
  SYNTHETIX = 'Synthetix',
  EXCHANGER = 'Exchanger',
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
