import { ethers } from 'ethers';
import { NULL_ADDRESS } from '../../../constants';
import { Address } from '../../../types';
import { _require } from '../../../utils';
import { PoolState } from '../types';
import { OracleLibrary } from './OracleLibrary';

type PoolKey = { token0: Address; token1: Address; fee: bigint };
const POOL_INIT_CODE_HASH =
  '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54';
const defaultAbiCoder = ethers.utils.defaultAbiCoder;
const keccak256 = ethers.utils.keccak256;
const solidityKeccak256 = ethers.utils.solidityKeccak256;

class DexPriceAggregatorUniswapV3 {
  assetToAsset(
    state: PoolState,
    _tokenIn: Address,
    _amountIn: bigint,
    _tokenOut: Address,
    _twapPeriod: bigint,
  ): bigint {
    if (_tokenIn === state.dexPriceAggregator.weth) {
      return this._ethToAsset(state, _amountIn, _tokenOut, _twapPeriod);
    } else if (_tokenOut === state.dexPriceAggregator.weth) {
      return this._assetToEth(state, _tokenIn, _amountIn, _twapPeriod);
    } else {
      return this._fetchAmountCrossingPools(
        state,
        _tokenIn,
        _amountIn,
        _tokenOut,
        _twapPeriod,
      );
    }
  }

  private _ethToAsset(
    state: PoolState,
    _ethAmountIn: bigint,
    _tokenOut: Address,
    _twapPeriod: bigint,
  ): bigint {
    const tokenIn = state.dexPriceAggregator.weth;
    const pool = this._getPoolForRoute(
      state,
      this._getPoolKey(
        tokenIn,
        _tokenOut,
        state.dexPriceAggregator.defaultPoolFee,
      ),
    );
    return this._fetchAmountFromSinglePool(
      tokenIn,
      _ethAmountIn,
      _tokenOut,
      pool,
      _twapPeriod,
    );
  }

  private _assetToEth(
    state: PoolState,
    _tokenIn: Address,
    _amountIn: bigint,
    _twapPeriod: bigint,
  ): bigint {
    const tokenOut = state.dexPriceAggregator.weth;
    const pool = this._getPoolForRoute(
      state,
      this._getPoolKey(
        _tokenIn,
        tokenOut,
        state.dexPriceAggregator.defaultPoolFee,
      ),
    );
    return this._fetchAmountFromSinglePool(
      _tokenIn,
      _amountIn,
      tokenOut,
      pool,
      _twapPeriod,
    );
  }

  private _fetchAmountCrossingPools(
    state: PoolState,
    _tokenIn: Address,
    _amountIn: bigint,
    _tokenOut: Address,
    _twapPeriod: bigint,
  ): bigint {
    // If the tokenIn:tokenOut route was overridden to use a single pool, derive price directly from that pool
    const overriddenPool = this._getOverriddenPool(
      state,
      this._getPoolKey(
        _tokenIn,
        _tokenOut,
        0n, // pool fee is unused
      ),
    );
    if (overriddenPool !== NULL_ADDRESS) {
      return this._fetchAmountFromSinglePool(
        _tokenIn,
        _amountIn,
        _tokenOut,
        overriddenPool,
        _twapPeriod,
      );
    }

    // Otherwise, derive the price by "crossing" through tokenIn:ETH -> ETH:tokenOut
    // To keep consistency, we cross through with the same price source (spot vs. twap)
    const pool1 = this._getPoolForRoute(
      state,
      this._getPoolKey(
        _tokenIn,
        state.dexPriceAggregator.weth,
        state.dexPriceAggregator.defaultPoolFee,
      ),
    );
    const pool2 = this._getPoolForRoute(
      state,
      this._getPoolKey(
        _tokenOut,
        state.dexPriceAggregator.weth,
        state.dexPriceAggregator.defaultPoolFee,
      ),
    );

    const [spotTick1] = OracleLibrary.getBlockStartingTickAndLiquidity(pool1);
    const [spotTick2] = OracleLibrary.getBlockStartingTickAndLiquidity(pool2);
    const spotAmountOut = this._getQuoteCrossingTicksThroughWeth(
      state,
      _tokenIn,
      _amountIn,
      _tokenOut,
      spotTick1,
      spotTick2,
    );

    const castedTwapPeriod = BigInt.asUintN(32, _twapPeriod);
    const [twapTick1] = OracleLibrary.consult(pool1, castedTwapPeriod);
    const [twapTick2] = OracleLibrary.consult(pool2, castedTwapPeriod);
    const twapAmountOut = this._getQuoteCrossingTicksThroughWeth(
      state,
      _tokenIn,
      _amountIn,
      _tokenOut,
      twapTick1,
      twapTick2,
    );

    // Return min amount between spot price and twap
    return spotAmountOut < twapAmountOut ? spotAmountOut : twapAmountOut;
  }

  private _getPoolForRoute(state: PoolState, _poolKey: PoolKey): Address {
    let pool = this._getOverriddenPool(state, _poolKey);
    if (pool === NULL_ADDRESS) {
      pool = this._computeAddress(
        state.dexPriceAggregator.uniswapV3Factory,
        _poolKey,
      );
    }
    return pool;
  }

  // https://github.com/Uniswap/v3-periphery/blob/main/contracts/libraries/PoolAddress.sol
  _computeAddress(factory: Address, key: PoolKey): Address {
    _require(
      key.token0 < key.token1,
      'Not sorted keys',
      { key },
      'key.token0 < key.token1',
    );

    const encodedKey = keccak256(
      defaultAbiCoder.encode(
        ['address', 'address', 'uint24'],
        [key.token0, key.token1, key.fee],
      ),
    );

    const bytesCalc = solidityKeccak256(
      ['bytes', 'address', 'bytes32', 'bytes32'],
      ['0xff', factory, encodedKey, POOL_INIT_CODE_HASH],
    );

    return (
      '0x' + BigInt.asUintN(160, BigInt(bytesCalc)).toString(16)
    ).toLowerCase();
  }

  private _fetchAmountFromSinglePool(
    _tokenIn: Address,
    _amountIn: bigint,
    _tokenOut: Address,
    _pool: Address,
    _twapPeriod: bigint,
  ): bigint {
    // Leave ticks as int256s to avoid solidity casting
    const [spotTick] = OracleLibrary.getBlockStartingTickAndLiquidity(_pool);
    const [twapTick] = OracleLibrary.consult(
      _pool,
      BigInt.asUintN(32, _twapPeriod),
    );

    // Return min amount between spot price and twap
    // Ticks are based on the ratio between token0:token1 so if the input token is token1 then
    // we need to treat the tick as an inverse
    let minTick;
    if (_tokenIn < _tokenOut) {
      minTick = spotTick < twapTick ? spotTick : twapTick;
    } else {
      minTick = spotTick > twapTick ? spotTick : twapTick;
    }

    return OracleLibrary.getQuoteAtTick(
      BigInt.asIntN(24, minTick), // can assume safe being result from consult()
      BigInt.asUintN(128, _amountIn),
      _tokenIn,
      _tokenOut,
    );
  }

  private _getPoolKey(tokenA: Address, tokenB: Address, fee: bigint): PoolKey {
    // https://github.com/Uniswap/v3-periphery/blob/main/contracts/libraries/PoolAddress.sol
    if (tokenA > tokenB) [tokenA, tokenB] = [tokenB, tokenA];
    return { token0: tokenA, token1: tokenB, fee };
  }

  private _getOverriddenPool(state: PoolState, _poolKey: PoolKey): Address {
    return state.dexPriceAggregator.overriddenPoolForRoute[
      this._identifyRouteFromPoolKey(_poolKey)
    ];
  }

  private _getQuoteCrossingTicksThroughWeth(
    state: PoolState,
    _tokenIn: Address,
    _amountIn: bigint,
    _tokenOut: Address,
    _tick1: bigint,
    _tick2: bigint,
  ): bigint {
    const ethAmountOut = OracleLibrary.getQuoteAtTick(
      _tick1,
      BigInt.asUintN(128, _amountIn),
      _tokenIn,
      state.dexPriceAggregator.weth,
    );
    return OracleLibrary.getQuoteAtTick(
      _tick2,
      BigInt.asUintN(128, ethAmountOut),
      state.dexPriceAggregator.weth,
      _tokenOut,
    );
  }

  private _identifyRouteFromPoolKey(_poolKey: PoolKey): string {
    return solidityKeccak256(
      ['address', 'address'],
      [_poolKey.token0, _poolKey.token1],
    );
  }
}

export const dexPriceAggregatorUniswapV3 = new DexPriceAggregatorUniswapV3();
