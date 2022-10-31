import _ from 'lodash';
import { funcName } from '../../../../utils';
import { ImplementationNames, PoolState } from '../../types';
import { IPoolContext, _rates } from '../types';
import { throwNotExist, requireConstant } from './utils';

const customPlain3CoinBTC: _rates = (
  self: IPoolContext,
  state: PoolState,
): bigint[] => {
  const { N_COINS } = self.constants;
  const USE_LENDING = requireConstant(self, 'USE_LENDING', funcName());
  const LENDING_PRECISION = requireConstant(
    self,
    'LENDING_PRECISION',
    funcName(),
  );
  const PRECISION_MUL = requireConstant(self, 'PRECISION_MUL', funcName());

  const result = [...PRECISION_MUL];
  const use_lending = [...USE_LENDING];
  for (const i of _.range(N_COINS)) {
    let rate = LENDING_PRECISION; // Used with no lending
    if (use_lending[i]) rate = state.exchangeRateCurrent[i];
    result[i] *= rate;
  }
  return result;
};

const notExist: _rates = (self: IPoolContext, state: PoolState) => {
  return throwNotExist('_rates', self.IMPLEMENTATION_NAME);
};

const implementations: Record<ImplementationNames, _rates> = {
  [ImplementationNames.CUSTOM_PLAIN_3COIN_BTC]: customPlain3CoinBTC,
  [ImplementationNames.CUSTOM_PLAIN_2COIN_FRAX]: notExist,
  [ImplementationNames.CUSTOM_PLAIN_3COIN_THREE]: notExist,

  [ImplementationNames.FACTORY_META_3POOL_2_8]: notExist,
  [ImplementationNames.FACTORY_META_3POOL_2_15]: notExist,

  [ImplementationNames.FACTORY_META_3POOL_3_1]: notExist,
  [ImplementationNames.FACTORY_META_3POOL_ERC20_FEE_TRANSFER]: notExist,
  [ImplementationNames.FACTORY_META_SBTC_ERC20]: notExist,

  [ImplementationNames.FACTORY_PLAIN_2COIN_ERC20]: notExist,
  [ImplementationNames.FACTORY_PLAIN_2COIN_ERC20_18DEC]: notExist,
  [ImplementationNames.FACTORY_PLAIN_2COIN_ERC20_FEE_TRANSFER]: notExist,
  [ImplementationNames.FACTORY_PLAIN_2COIN_NATIVE]: notExist,

  [ImplementationNames.FACTORY_PLAIN_3COIN_ERC20]: notExist,
  [ImplementationNames.FACTORY_PLAIN_3COIN_ERC20_18DEC]: notExist,
  [ImplementationNames.FACTORY_PLAIN_3COIN_ERC20_FEE_TRANSFER]: notExist,

  [ImplementationNames.FACTORY_PLAIN_4COIN_ERC20]: notExist,
  [ImplementationNames.FACTORY_PLAIN_4COIN_ERC20_18DEC]: notExist,
};

export default implementations;
