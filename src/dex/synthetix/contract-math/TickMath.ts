import { BI_MAX_UINT256 } from '../../../bigint-constants';
import { _require } from '../../../utils';

export class TickMath {
  static readonly MIN_TICK = -887272n;
  static readonly MAX_TICK = -TickMath.MIN_TICK;
  static readonly MIN_SQRT_RATIO = 4295128739n;
  static readonly MAX_SQRT_RATIO =
    1461446703485210103287273052203988822378723970342n;

  static getSqrtRatioAtTick(tick: bigint): bigint {
    const absTick =
      tick < 0n
        ? BigInt.asUintN(256, -BigInt.asIntN(256, tick))
        : BigInt.asUintN(256, BigInt.asIntN(256, tick));
    _require(
      absTick <= BigInt.asUintN(256, TickMath.MAX_TICK),
      'T',
      { absTick },
      'absTick <= BigInt.asUintN(256, TickMath.MAX_TICK)',
    );

    let ratio =
      (absTick & 0x1n) !== 0n
        ? 0xfffcb933bd6fad37aa2d162d1a594001n
        : 0x100000000000000000000000000000000n;
    if ((absTick & 0x2n) !== 0n)
      ratio = (ratio * 0xfff97272373d413259a46990580e213an) >> 128n;
    if ((absTick & 0x4n) !== 0n)
      ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdccn) >> 128n;
    if ((absTick & 0x8n) !== 0n)
      ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0n) >> 128n;
    if ((absTick & 0x10n) !== 0n)
      ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644n) >> 128n;
    if ((absTick & 0x20n) !== 0n)
      ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0n) >> 128n;
    if ((absTick & 0x40n) !== 0n)
      ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861n) >> 128n;
    if ((absTick & 0x80n) !== 0n)
      ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053n) >> 128n;
    if ((absTick & 0x100n) !== 0n)
      ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4n) >> 128n;
    if ((absTick & 0x200n) !== 0n)
      ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54n) >> 128n;
    if ((absTick & 0x400n) !== 0n)
      ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3n) >> 128n;
    if ((absTick & 0x800n) !== 0n)
      ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9n) >> 128n;
    if ((absTick & 0x1000n) !== 0n)
      ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825n) >> 128n;
    if ((absTick & 0x2000n) !== 0n)
      ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5n) >> 128n;
    if ((absTick & 0x4000n) !== 0n)
      ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7n) >> 128n;
    if ((absTick & 0x8000n) !== 0n)
      ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6n) >> 128n;
    if ((absTick & 0x10000n) !== 0n)
      ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9n) >> 128n;
    if ((absTick & 0x20000n) !== 0n)
      ratio = (ratio * 0x5d6af8dedb81196699c329225ee604n) >> 128n;
    if ((absTick & 0x40000n) !== 0n)
      ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98n) >> 128n;
    if ((absTick & 0x80000n) !== 0n)
      ratio = (ratio * 0x48a170391f7dc42444e8fa2n) >> 128n;

    if (tick > 0) ratio = BI_MAX_UINT256 / ratio;
    return BigInt.asUintN(
      160,
      (ratio >> 32n) + (ratio % (1n << 32n) == 0n ? 0n : 1n),
    );
  }
}
