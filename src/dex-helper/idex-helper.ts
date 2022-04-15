// import { Contract } from '@ethersproject/contracts';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Address, LoggerConstructor } from '../types';
import { ICache } from './icache';
import { IRequestWrapper } from './irequest-wrapper';
import { IBlockManager } from './iblock-manager';
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { Token } from '../types';

export interface IDexHelper {
  cache: ICache;
  httpRequest: IRequestWrapper;
  augustusAddress: Address;
  multiContract: Contract;
  provider: JsonRpcProvider;
  web3Provider: Web3;
  blockManager: IBlockManager;
  getLogger: LoggerConstructor;
  getTokenUSDPrice: (token: Token, amount: bigint) => number;
}
