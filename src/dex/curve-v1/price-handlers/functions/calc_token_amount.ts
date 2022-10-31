import _ from 'lodash';
import { ImplementationNames, PoolState } from '../../types';
import { calc_token_amount, IPoolContext } from '../types';
import { throwNotImplemented } from './utils';

const customPlain2CoinThree: calc_token_amount = (
  self: IPoolContext,
  state: PoolState,
  amounts: bigint[],
  is_deposit: boolean,
) => {
  const { N_COINS } = self.constants;
  const amp = state.A;
  const balances = [...state.balances];
  const D0 = self.get_D_mem(self, state, balances, amp);
  for (const i of _.range(N_COINS)) {
    if (is_deposit) balances[i] += amounts[i];
    else balances[i] -= amounts[i];
  }
  const D1 = self.get_D_mem(self, state, balances, amp);
  const token_amount = state.totalSupply;
  let diff = 0n;
  if (is_deposit) {
    diff = D1 - D0;
  } else {
    diff = D0 - D1;
  }
  return (diff * token_amount) / D0;
};

const notImplemented: calc_token_amount = (
  self: IPoolContext,
  state: PoolState,
  amounts: bigint[],
  is_deposit: boolean,
) => {
  return throwNotImplemented('calc_token_amount', self.IMPLEMENTATION_NAME);
};

const implementations: Record<ImplementationNames, calc_token_amount> = {
  [ImplementationNames.CUSTOM_PLAIN_2COIN_FRAX]: customPlain2CoinThree,
  [ImplementationNames.CUSTOM_PLAIN_3COIN_BTC]: customPlain2CoinThree,
  [ImplementationNames.CUSTOM_PLAIN_3COIN_THREE]: customPlain2CoinThree,

  [ImplementationNames.FACTORY_META_3POOL_2_8]: notImplemented,
  [ImplementationNames.FACTORY_META_3POOL_2_15]: notImplemented,

  [ImplementationNames.FACTORY_META_3POOL_3_1]: notImplemented,
  [ImplementationNames.FACTORY_META_3POOL_ERC20_FEE_TRANSFER]: notImplemented,
  [ImplementationNames.FACTORY_META_SBTC_ERC20]: notImplemented,

  [ImplementationNames.FACTORY_PLAIN_2COIN_ERC20]: notImplemented,
  [ImplementationNames.FACTORY_PLAIN_2COIN_ERC20_18DEC]: notImplemented,
  [ImplementationNames.FACTORY_PLAIN_2COIN_ERC20_FEE_TRANSFER]: notImplemented,
  [ImplementationNames.FACTORY_PLAIN_2COIN_NATIVE]: notImplemented,

  [ImplementationNames.FACTORY_PLAIN_3COIN_ERC20]: notImplemented,
  [ImplementationNames.FACTORY_PLAIN_3COIN_ERC20_18DEC]: notImplemented,
  [ImplementationNames.FACTORY_PLAIN_3COIN_ERC20_FEE_TRANSFER]: notImplemented,

  [ImplementationNames.FACTORY_PLAIN_4COIN_ERC20]: notImplemented,
  [ImplementationNames.FACTORY_PLAIN_4COIN_ERC20_18DEC]: notImplemented,
};

export default implementations;
