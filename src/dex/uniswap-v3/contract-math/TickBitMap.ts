import { BI_MAX_UINT8 } from '../../../bigint-constants';
import { PoolState } from '../types';
import { BitMath } from './BitMath';
import { _require } from '../../../utils';
import { DeepReadonly } from 'ts-essentials';
import {
  OUT_OF_RANGE_ERROR_POSTFIX,
  TICK_BITMAP_BUFFER,
  TICK_BITMAP_TO_USE,
} from '../constants';

function isWordPosOut(
  wordPos: bigint,
  startTickBitmap: bigint,
  // For pricing we use wider range to check price impact. If the function called from event
  // it must always be within buffer
  isPriceQuery: boolean,
) {
  let lowerTickBitmapLimit;
  let upperTickBitmapLimit;

  if (isPriceQuery) {
    lowerTickBitmapLimit =
      startTickBitmap - (TICK_BITMAP_BUFFER + TICK_BITMAP_TO_USE);
    upperTickBitmapLimit =
      startTickBitmap + (TICK_BITMAP_BUFFER + TICK_BITMAP_TO_USE);
  } else {
    lowerTickBitmapLimit = startTickBitmap - TICK_BITMAP_BUFFER;
    upperTickBitmapLimit = startTickBitmap + TICK_BITMAP_BUFFER;
  }

  _require(
    wordPos >= lowerTickBitmapLimit && wordPos <= upperTickBitmapLimit,
    `wordPos is out of safe state tickBitmap request range: ${OUT_OF_RANGE_ERROR_POSTFIX}`,
    { wordPos },
    `wordPos >= LOWER_TICK_REQUEST_LIMIT && wordPos <= UPPER_TICK_REQUEST_LIMIT`,
  );
}

export class TickBitMap {
  static position(tick: bigint): [bigint, bigint] {
    return [BigInt.asIntN(16, tick >> 8n), BigInt.asUintN(8, tick % 256n)];
  }

  static flipTick(state: PoolState, tick: bigint, tickSpacing: bigint) {
    _require(
      tick % tickSpacing === 0n,
      '',
      { tick, tickSpacing },
      'tick % tickSpacing == 0n,',
    );
    const [wordPos, bitPos] = TickBitMap.position(tick / tickSpacing);
    const mask = 1n << bitPos;

    // flipTick is used only in _updatePosition which is always state changing event
    // Therefore it is never used in price query
    isWordPosOut(wordPos, state.startTickBitmap, false);

    state.tickBitmap[wordPos.toString()] ^= mask;
  }

  static nextInitializedTickWithinOneWord(
    state: DeepReadonly<PoolState>,
    tick: bigint,
    tickSpacing: bigint,
    lte: boolean,
    isPriceQuery: boolean,
  ): [bigint, boolean] {
    let compressed = tick / tickSpacing;
    if (tick < 0n && tick % tickSpacing != 0n) compressed--;

    let next = 0n;
    let initialized = false;

    if (lte) {
      const [wordPos, bitPos] = TickBitMap.position(compressed);
      const mask = (1n << bitPos) - 1n + (1n << bitPos);

      isWordPosOut(wordPos, state.startTickBitmap, isPriceQuery);
      let tickBitmapValue = state.tickBitmap[wordPos.toString()];
      tickBitmapValue = tickBitmapValue === undefined ? 0n : tickBitmapValue;

      const masked = tickBitmapValue & mask;

      initialized = masked != 0n;
      next = initialized
        ? (compressed -
            BigInt.asIntN(24, bitPos - BitMath.mostSignificantBit(masked))) *
          tickSpacing
        : (compressed - BigInt.asIntN(24, bitPos)) * tickSpacing;
    } else {
      // start from the word of the next tick, since the current tick state doesn't matter
      const [wordPos, bitPos] = TickBitMap.position(compressed + 1n);
      const mask = ~((1n << bitPos) - 1n);

      isWordPosOut(wordPos, state.startTickBitmap, isPriceQuery);
      let tickBitmapValue = state.tickBitmap[wordPos.toString()];
      tickBitmapValue = tickBitmapValue === undefined ? 0n : tickBitmapValue;

      const masked = tickBitmapValue & mask;

      initialized = masked != 0n;
      next = initialized
        ? (compressed +
            1n +
            BigInt.asIntN(24, BitMath.leastSignificantBit(masked) - bitPos)) *
          tickSpacing
        : (compressed + 1n + BigInt.asIntN(24, BI_MAX_UINT8 - bitPos)) *
          tickSpacing;
    }

    return [next, initialized];
  }

  static _putZeroIfUndefined(
    state: PoolState,
    tickBitmapValue: bigint | undefined,
    wordPos: bigint,
    isPriceQuery: boolean = false,
  ): bigint {
    return tickBitmapValue === undefined ? 0n : tickBitmapValue;
  }
}
