import { bigIntify, MathUtil } from './utils';
import { Logger } from '../../types';
import { PoolState } from './types';
import { DeepReadonly } from 'ts-essentials';

export class NervePoolMath {
  readonly FEE_DENOMINATOR = bigIntify(10 ** 10);
  readonly A_PRECISION = bigIntify(100);
  readonly MAX_LOOP_LIMIT = bigIntify(256);
  readonly POOL_PRECISION_DECIMALS = bigIntify(18);

  constructor(protected name: string, protected logger: Logger) {}

  calculateSwap(
    state: DeepReadonly<PoolState>,
    tokenIndexFrom: number,
    tokenIndexTo: number,
    dx: bigint,
    blockTimestamp: bigint,
  ) {
    const xp = this._xp(state);

    // uint256 x = dx.mul(self.tokenPrecisionMultipliers[tokenIndexFrom])
    //    .add(xp[tokenIndexFrom]);
    const x =
      dx * state.tokenPrecisionMultipliers[tokenIndexFrom] + xp[tokenIndexFrom];

    const y = this._getY(
      state,
      tokenIndexFrom,
      tokenIndexTo,
      x,
      xp,
      blockTimestamp,
    );

    // dy = xp[tokenIndexTo].sub(y).sub(1);
    let dy = xp[tokenIndexTo] - y - 1n;

    // dyFee = dy.mul(self.swapFee).div(FEE_DENOMINATOR);
    const dyFee = (dy * state.swapFee) / this.FEE_DENOMINATOR;

    // dy = dy.sub(dyFee).div(self.tokenPrecisionMultipliers[tokenIndexTo]);
    dy = (dy - dyFee) / state.tokenPrecisionMultipliers[tokenIndexTo];
    return { dy, dyFee };
  }

  calculateWithdrawOneToken(
    state: DeepReadonly<PoolState>,
    tokenAmount: bigint,
    tokenIndex: number,
    blockTimeStamp: bigint,
  ) {
    let { dy, newY } = this._calculateWithdrawOneTokenDY(
      state,
      tokenIndex,
      tokenAmount,
      blockTimeStamp,
    );

    // uint256 dySwapFee = _xp(self)[tokenIndex].sub(newY)
    //  .div(self.tokenPrecisionMultipliers[tokenIndex]).sub(dy)
    const dySwapFee =
      (this._xp(state)[tokenIndex] - newY) /
        state.tokenPrecisionMultipliers[tokenIndex] -
      dy;

    // dy = dy.mul(FEE_DENOMINATOR.sub(calculateCurrentWithdrawFee(self, account)))
    //  .div(FEE_DENOMINATOR);
    dy =
      (dy * (this.FEE_DENOMINATOR - this._calculateCurrentWithdrawFee(state))) /
      this.FEE_DENOMINATOR;

    return { dy, dyFee: dySwapFee };
  }

  protected _getNumTokens(state: DeepReadonly<PoolState>) {
    return bigIntify(state.tokenPrecisionMultipliers.length);
  }

  protected _calculateWithdrawOneTokenDY(
    state: DeepReadonly<PoolState>,
    tokenIndex: number,
    tokenAmount: bigint,
    blockTimestamp: bigint,
  ) {
    const numTokens = this._getNumTokens(state);
    const xp = this._xp(state);
    const v = {
      d0: 0n,
      d1: 0n,
      newY: 0n,
      feePerToken: 0n,
      preciseA: 0n,
    };
    v.preciseA = this._getAPrecise(state, blockTimestamp);
    v.d0 = this._getD(state, xp, v.preciseA);

    // v.d1 = v.d0.sub(tokenAmount.mul(v.d0).div(self.lpToken.totalSupply()));
    v.d1 = v.d0 - (tokenAmount * v.d0) / state.lpToken_supply;
    v.newY = this._getYD(v.preciseA, tokenIndex, xp, v.d1);

    const xpReduced: bigint[] = [];

    v.feePerToken = this._feePerToken(state);
    for (let i = 0; i < numTokens; i++) {
      const xpi = xp[i];
      // if i == tokenIndex, dxExpected = xpi.mul(v.d1).div(v.d0).sub(v.newY)
      // else dxExpected = xpi.sub(xpi.mul(v.d1).div(v.d0))
      const dxExpected =
        i === tokenIndex
          ? (xpi * v.d1) / v.d0 - v.newY
          : xpi - (xpi * v.d1) / v.d0;

      // xpReduced[i] = xpi.sub(dxExpected.mul(v.feePerToken).div(FEE_DENOMINATOR))
      xpReduced[i] = xpi - (dxExpected * v.feePerToken) / this.FEE_DENOMINATOR;
    }

    const yd = this._getYD(v.preciseA, tokenIndex, xpReduced, v.d1);
    // uint256 dy = xpReduced[tokenIndex].sub(getYD(v.preciseA, tokenIndex, xpReduced, v.d1));
    let dy = xpReduced[tokenIndex] - yd;

    // dy = dy.sub(1).div(self.tokenPrecisionMultipliers[tokenIndex]);
    dy = (dy - 1n) / state.tokenPrecisionMultipliers[tokenIndex];

    return { dy, newY: v.newY };
  }

  protected _feePerToken(state: DeepReadonly<PoolState>) {
    const numTokens = this._getNumTokens(state);
    // self.swapFee.mul(self.pooledTokens.length).div(self.pooledTokens.length.sub(1).mul(4));
    return (state.swapFee * numTokens) / ((numTokens - 1n) * bigIntify(4));
  }

  protected _calculateCurrentWithdrawFee(state: DeepReadonly<PoolState>) {
    // It is not correct. We should calculate user withdrawFeeMultiplier by
    // the time passed since the liquidity was added
    return state.defaultWithdrawFee ? state.defaultWithdrawFee : 0n;
  }

  protected _getYD(a: bigint, tokenIndex: number, xp: bigint[], d: bigint) {
    const numTokens = bigIntify(xp.length);

    let c = d;
    let s: bigint = 0n;
    const nA = a * numTokens;

    for (let i = 0; i < numTokens; i++) {
      if (i != tokenIndex) {
        // s = s.add(xp[i]);
        s = s + xp[i];

        // c = c.mul(d).div(xp[i].mul(numTokens));
        c = (c * d) / (xp[i] * numTokens);
      }
    }
    // c = c.mul(d).mul(A_PRECISION).div(nA.mul(numTokens));
    c = (c * d * this.A_PRECISION) / (nA * numTokens);

    // uint256 b = s.add(d.mul(A_PRECISION).div(nA));
    const b = s + (d * this.A_PRECISION) / nA;
    let yPrev: bigint;
    let y = d;

    for (let i = 0; i < this.MAX_LOOP_LIMIT; i++) {
      yPrev = y;

      // y = y.mul(y).add(c).div(y.mul(2).add(b).sub(d));
      y = (y * y + c) / (y * bigIntify(2) + b - d);
      if (MathUtil.within1(y, yPrev)) {
        return y;
      }
    }

    const error = new Error(
      `Event pool ${this.name} method _getYD did not converge`,
    );
    this.logger.error(error);
    throw error;
  }

  _getY(
    state: DeepReadonly<PoolState>,
    tokenIndexFrom: number,
    tokenIndexTo: number,
    x: bigint,
    xp: bigint[],
    blockTimestamp: bigint,
  ) {
    const numTokens = this._getNumTokens(state);
    const a = this._getAPrecise(state, blockTimestamp);
    const d = this._getD(state, xp, a);
    let c = d;
    let s: bigint = 0n;
    const nA = numTokens * a;

    let _x: bigint;
    for (let i = 0; i < numTokens; i++) {
      if (i == tokenIndexFrom) {
        _x = x;
      } else if (i != tokenIndexTo) {
        _x = xp[i];
      } else {
        continue;
      }
      s = s + _x;
      // c = c.mul(d).div(_x.mul(numTokens));
      c = (c * d) / (_x * numTokens);
    }
    // c = c.mul(d).mul(A_PRECISION).div(nA.mul(numTokens));
    c = (c * d * this.A_PRECISION) / (nA * numTokens);

    // uint256 b = s.add(d.mul(A_PRECISION).div(nA));
    const b = s + (d * this.A_PRECISION) / nA;
    let yPrev: bigint;
    let y = d;

    for (let i = 0; i < this.MAX_LOOP_LIMIT; i++) {
      yPrev = y;
      // y = y.mul(y).add(c).div(y.mul(2).add(b).sub(d));
      y = (y * y + c) / (y * bigIntify(2) + b - d);

      if (MathUtil.within1(y, yPrev)) {
        return y;
      }
    }

    const error = new Error(
      `Event pool ${this.name} parsing function _getY approximation did not converge`,
    );
    this.logger.error(error);
    throw error;
  }

  protected _getAPrecise(
    state: DeepReadonly<PoolState>,
    blockTimestamp: bigint,
  ) {
    const t1 = state.futureATime; // time when ramp is finished
    const a1 = state.futureA; // final A value when ramp is finished

    if (blockTimestamp < t1) {
      const t0 = state.initialATime; // time when ramp is started
      const a0 = state.initialA; // initial A value when ramp is started
      if (a1 > a0) {
        // a0.add(a1.sub(a0).mul(block.timestamp.sub(t0)).div(t1.sub(t0)));
        return a0 + ((a1 - a0) * (blockTimestamp - t0)) / (t1 - t0);
      } else {
        // a0.sub(a0.sub(a1).mul(block.timestamp.sub(t0)).div(t1.sub(t0)));
        return a0 - ((a0 - a1) * (blockTimestamp - t0)) / (t1 - t0);
      }
    } else {
      return a1;
    }
  }

  protected _getD(state: DeepReadonly<PoolState>, xp: bigint[], a: bigint) {
    const numTokens = bigIntify(xp.length);
    let s: bigint = 0n;
    for (let i = 0; i < numTokens; i++) {
      s = s + xp[i];
    }
    if (s === 0n) {
      return 0n;
    }

    let prevD: bigint;
    let d = s;
    let nA = a * numTokens;

    for (let i = 0; i < this.MAX_LOOP_LIMIT; i++) {
      let dP = d;
      for (let j = 0; j < numTokens; j++) {
        // dP = dP.mul(d).div(xp[j].mul(numTokens));
        dP = (dP * d) / (xp[j] * numTokens);
      }
      prevD = d;
      // d = nA.mul(s).div(A_PRECISION).add(dP.mul(numTokens)).mul(d).div(
      //    nA.sub(A_PRECISION).mul(d).div(A_PRECISION).add(
      //      numTokens.add(1).mul(dP)));
      d =
        (((nA * s) / this.A_PRECISION + dP * numTokens) * d) /
        (((nA - this.A_PRECISION) * d) / this.A_PRECISION +
          (numTokens + 1n) * dP);
      if (MathUtil.within1(d, prevD)) {
        return d;
      }
    }

    // Convergence should occur in 4 loops or less. If this is reached, there may be something wrong
    // with the pool.
    const error = new Error(
      `Event pool ${this.name} method _getD did not converge`,
    );
    this.logger.error(error);
    throw error;
  }

  _xp(state: DeepReadonly<PoolState>) {
    return state.balances.map(
      (balanceValue, i) => balanceValue * state.tokenPrecisionMultipliers[i],
    );
  }
}
