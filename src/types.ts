import { SwapSide } from './constants';
import { Address } from 'paraswap-core';
import { BlockHeader } from 'web3-eth';
export { BlockHeader } from 'web3-eth';
export {
  Address,
  NumberAsString,
  Adapters,
  OptimalRoute,
  OptimalSwap,
  OptimalSwapExchange,
  OptionalRate,
  OptimalRate,
} from 'paraswap-core';
import { Logger } from 'log4js';
export { Logger } from 'log4js';
import { OptimalRate } from 'paraswap-core';
import BigNumber from 'bignumber.js';

// Check: Should the logger be replaced with Logger Interface
export type LoggerConstructor = (name?: string) => Logger;

export type ContractSellData = {
  fromToken: string;
  fromAmount: string;
  toAmount: string;
  expectedAmount: string;
  beneficiary: string;
  path: ContractPath[];
  partner: string;
  feePercent: string;
  permit: string;
  deadline: string;
  uuid: string;
};

export type ContractMegaSwapSellData = {
  fromToken: string;
  fromAmount: string;
  toAmount: string;
  expectedAmount: string;
  beneficiary: string;
  path: ContractMegaSwapPath[];
  partner: string;
  feePercent: string;
  permit: string;
  deadline: string;
  uuid: string;
};

export type ContractBuyData = {
  adapter: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  expectedAmount: string;
  beneficiary: string;
  route: ContractRoute[];
  partner: string;
  feePercent: string;
  permit: string;
  deadline: string;
  uuid: string;
};

export type ConstractSimpleData = {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  expectedAmount: string;
  callees: string[];
  exchangeData: string;
  startIndexes: number[];
  values: string[];
  beneficiary: string;
  partner: string;
  feePercent: string;
  permit: string;
  deadline: string;
  uuid: string;
};

export type ContractSimpleBuyNFTData = {
  fromToken: string;
  toTokenDetails: {
    toToken: string;
    toTokenID: string;
    toAmount: string;
  }[];
  fromAmount: string;
  expectedAmount: string;
  callees: string[];
  exchangeData: string;
  startIndexes: number[];
  values: string[];
  beneficiary: string;
  partner: string;
  feePercent: string;
  permit: string;
  deadline: string;
  uuid: string;
};

export type ContractAdapter = {
  adapter: string;
  percent: string;
  networkFee: string;
  route: ContractRoute[];
};

export type ContractRoute = {
  index: number;
  targetExchange: string;
  percent: string;
  payload: string;
  networkFee: string;
};

export type ContractMegaSwapPath = {
  fromAmountPercent: string;
  path: ContractPath[];
};

export type ContractPath = {
  to: string;
  totalNetworkFee: string;
  adapters: ContractAdapter[];
};

export type ContractBuyAdapter = {
  adapter: string;
  payload: string;
  networkFee: string;
  route: ContractBuyRoute[];
};

export type ContractBuyRoute = {
  index: number;
  targetExchange: string;
  fromAmount: string;
  toAmount: string;
  payload: string;
  networkFee: string;
};

export type TxInfo<T> = {
  params: T;
  encoder: ContractMethodEncoder;
  networkFee: string;
};

export type AdapterExchangeParam = {
  targetExchange: Address;
  payload: string;
  networkFee: string;
};

export type AdapterMappings = {
  [side: string]: { name: string; index: number }[];
};

export type SimpleExchangeParam = {
  callees: string[];
  calldata: string[];
  values: string[];
  networkFee: string;
};

// TODO: fix the type
export type ContractMethodEncoder = (...args: any[]) => any;

export type Token = {
  address: string;
  decimals: number;
  symbol?: string;
};

export type aToken = {
  aSymbol: string;
  aAddress: string;
  address: string;
  decimals: number;
};

export type ExchangePrices<T> = PoolPrices<T>[];

export type PoolPrices<T> = {
  prices: bigint[];
  unit: bigint;
  data: T;
  poolIdentifier?: string;
  exchange: string;
  gasCost: number | number[];
  poolAddresses?: Array<Address>;
};

export type PoolLiquidity = {
  exchange: string;
  address: Address;
  connectorTokens: Token[];
  liquidityUSD: number;
};

export interface Log {
  address: string;
  data: string;
  topics: string[];
  logIndex: number;
  transactionIndex: number;
  transactionHash: string;
  blockHash: string;
  blockNumber: number;

  // The following are not declared in web3-core, but still appear in logs
  removed?: boolean;
  id?: string;
}

export type DexConfigMap<DexParams> = {
  [dexKey: string]: {
    [network: number]: DexParams;
  };
};

export type TxObject = {
  from: Address;
  to?: Address; // undefined in case of contract deployment
  value: string;
  data: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
};

export type UnoptimizedRate = Omit<
  OptimalRate,
  'contractMethod' | 'srcUSD' | 'destUSD' | 'hmac' | 'partnerFee'
>;

export type MultiCallInput = {
  target: Address;
  callData: string;
};

export type MultiCallOutput = string;

export type Config = {
  network: number;
  networkName: string;
  isTestnet: boolean;
  mainnetNetwork?: number;
  nativeTokenName: string;
  nativeTokenSymbol: string;
  wrappedNativeTokenName: string;
  wrappedNativeTokenSymbol: string;
  wrappedNativeTokenAddress: Address;
  hasEIP1559: boolean;
  augustusAddress: Address;
  tokenTransferProxyAddress: Address;
  multicallV2Address: Address;
  privateHttpProvider: string;
  adapterAddresses: { [name: string]: Address };
  uniswapV2ExchangeRouterAddress: Address;
};

export type BigIntAsString = string;

export type ExchangeTxInfo = {
  deadline?: bigint;
};

export type PreprocessTransactionOptions = {
  slippageFactor: BigNumber;
  txOrigin: Address;
};
