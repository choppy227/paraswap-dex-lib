import { MathSol, BZERO, BONE } from './balancer-v2-math';

const _require = (b: boolean, message: string) => {
  if (!b) throw new Error(message);
};

class BasePool {
  _subtractSwapFeeAmount(amount: bigint, _swapFeePercentage: bigint): bigint {
    // This returns amount - fee amount, so we round up (favoring a higher fee amount).
    const feeAmount = MathSol.mulUpFixed(amount, _swapFeePercentage);
    return amount - feeAmount;
  }

  // These methods use fixed versions to match SC scaling
  _upscaleArray(amounts: bigint[], scalingFactors: bigint[]): bigint[] {
    return amounts.map((a, i) => MathSol.mulUpFixed(a, scalingFactors[i]));
  }

  _upscale(amount: bigint, scalingFactor: bigint): bigint {
    return MathSol.mulUpFixed(amount, scalingFactor);
  }

  _downscaleDown(amount: bigint, scalingFactor: bigint): bigint {
    return MathSol.divDownFixed(amount, scalingFactor);
  }
}

abstract class BaseGeneralPool extends BasePool {
  // Swap Hooks

  // Modification: this is inspired from the function onSwap which is in the original contract
  onSell(
    amounts: bigint[],
    balances: bigint[],
    indexIn: number,
    indexOut: number,
    _scalingFactors: bigint[],
    _swapFeePercentage: bigint,
    _amplificationParameter: bigint,
  ): bigint[] {
    // _validateIndexes(indexIn, indexOut, _getTotalTokens());
    // uint256[] memory scalingFactors = _scalingFactors();
    return this._swapGivenIn(
      amounts,
      balances,
      indexIn,
      indexOut,
      _scalingFactors,
      _swapFeePercentage,
      _amplificationParameter,
    );
  }

  _swapGivenIn(
    tokenAmountsIn: bigint[],
    balances: bigint[],
    indexIn: number,
    indexOut: number,
    scalingFactors: bigint[],
    _swapFeePercentage: bigint,
    _amplificationParameter: bigint,
  ): bigint[] {
    // Fees are subtracted before scaling, to reduce the complexity of the rounding direction analysis.
    const tokenAmountsInWithFee = tokenAmountsIn.map(a =>
      this._subtractSwapFeeAmount(a, _swapFeePercentage),
    );

    const balancesUpscaled = this._upscaleArray(balances, scalingFactors);
    const tokenAmountsInScaled = tokenAmountsInWithFee.map(a =>
      this._upscale(a, scalingFactors[indexIn]),
    );

    const amountsOut = this._onSwapGivenIn(
      tokenAmountsInScaled,
      balancesUpscaled,
      indexIn,
      indexOut,
      _amplificationParameter,
    );

    // amountOut tokens are exiting the Pool, so we round down.
    return amountsOut.map(a =>
      this._downscaleDown(a, scalingFactors[indexOut]),
    );
  }

  /*
   * @dev Called when a swap with the Pool occurs, where the amount of tokens entering the Pool is known.
   *
   * Returns the amount of tokens that will be taken from the Pool in return.
   *
   * All amounts inside `swapRequest` and `balances` are upscaled. The swap fee has already been deducted from
   * `swapRequest.amount`.
   *
   * The return value is also considered upscaled, and will be downscaled (rounding down) before returning it to the
   * Vault.
   */
  abstract _onSwapGivenIn(
    tokenAmountsIn: bigint[],
    balances: bigint[],
    indexIn: number,
    indexOut: number,
    _amplificationParameter: bigint,
  ): bigint[];
}

abstract class BaseMinimalSwapInfoPool extends BasePool {
  // Swap Hooks

  // Modification: this is inspired from the function onSwap which is in the original contract
  onSell(
    tokenAmountsIn: bigint[],
    balanceTokenIn: bigint,
    balanceTokenOut: bigint,
    _scalingFactorTokenIn: bigint,
    _scalingFactorTokenOut: bigint,
    _weightIn: bigint,
    _weightOut: bigint,
    _swapFeePercentage: bigint,
  ): bigint[] {
    // uint256 _scalingFactorTokenIn = _scalingFactor(request.tokenIn);
    // uint256 _scalingFactorTokenOut = _scalingFactor(request.tokenOut);

    // Fees are subtracted before scaling, to reduce the complexity of the rounding direction analysis.
    const tokenAmountsInWithFee = tokenAmountsIn.map(a =>
      this._subtractSwapFeeAmount(a, _swapFeePercentage),
    );

    // All token amounts are upscaled.
    balanceTokenIn = this._upscale(balanceTokenIn, _scalingFactorTokenIn);
    balanceTokenOut = this._upscale(balanceTokenOut, _scalingFactorTokenOut);
    const tokenAmountsInScaled = tokenAmountsInWithFee.map(a =>
      this._upscale(a, _scalingFactorTokenIn),
    );

    const amountsOut = this._onSwapGivenIn(
      tokenAmountsInScaled,
      balanceTokenIn,
      balanceTokenOut,
      _weightIn,
      _weightOut,
    );

    // amountOut tokens are exiting the Pool, so we round down.
    return amountsOut.map(a => this._downscaleDown(a, _scalingFactorTokenOut));
  }

  abstract _onSwapGivenIn(
    tokenAmountsIn: bigint[],
    currentBalanceTokenIn: bigint,
    currentBalanceTokenOut: bigint,
    _weightIn: bigint,
    _weightOut: bigint,
  ): bigint[];
}

class StableMath {
  static _AMP_PRECISION = BigInt(1e3);

  static _calculateInvariant(
    amplificationParameter: bigint,
    balances: bigint[],
    roundUp: boolean,
  ): bigint {
    /**********************************************************************************************
      // invariant                                                                                 //
      // D = invariant                                                  D^(n+1)                    //
      // A = amplification coefficient      A  n^n S + D = A D n^n + -----------                   //
      // S = sum of balances                                             n^n P                     //
      // P = product of balances                                                                   //
      // n = number of tokens                                                                      //
      *********x************************************************************************************/

    // We support rounding up or down.

    let sum = BZERO;
    const numTokens = balances.length;
    for (let i = 0; i < numTokens; i++) {
      sum = sum + balances[i];
    }
    if (sum == BZERO) {
      return BZERO;
    }

    let prevInvariant = BZERO;
    let invariant = sum;
    const ampTimesTotal = amplificationParameter * BigInt(numTokens);

    for (let i = 0; i < 255; i++) {
      let P_D = balances[0] * BigInt(numTokens);
      for (let j = 1; j < numTokens; j++) {
        P_D = MathSol.div(
          MathSol.mul(MathSol.mul(P_D, balances[j]), BigInt(numTokens)),
          invariant,
          roundUp,
        );
      }
      prevInvariant = invariant;
      invariant = MathSol.div(
        MathSol.mul(MathSol.mul(BigInt(numTokens), invariant), invariant) +
          MathSol.div(
            MathSol.mul(MathSol.mul(ampTimesTotal, sum), P_D),
            this._AMP_PRECISION,
            roundUp,
          ),
        MathSol.mul(BigInt(numTokens + 1), invariant) +
          // No need to use checked arithmetic for the amp precision, the amp is guaranteed to be at least 1
          MathSol.div(
            MathSol.mul(ampTimesTotal - this._AMP_PRECISION, P_D),
            this._AMP_PRECISION,
            !roundUp,
          ),
        roundUp,
      );

      if (invariant > prevInvariant) {
        if (invariant - prevInvariant <= 1) {
          return invariant;
        }
      } else if (prevInvariant - invariant <= 1) {
        return invariant;
      }
    }

    throw new Error('Errors.STABLE_INVARIANT_DIDNT_CONVERGE');
  }

  static _calcOutGivenIn(
    amplificationParameter: bigint,
    balances: bigint[],
    tokenIndexIn: number,
    tokenIndexOut: number,
    tokenAmountsIn: bigint[],
  ): bigint[] {
    /**************************************************************************************************************
    // outGivenIn token x for y - polynomial equation to solve                                                   //
    // ay = amount out to calculate                                                                              //
    // by = balance token out                                                                                    //
    // y = by - ay (finalBalanceOut)                                                                             //
    // D = invariant                                               D                     D^(n+1)                 //
    // A = amplification coefficient               y^2 + ( S - ----------  - D) * y -  ------------- = 0         //
    // n = number of tokens                                    (A * n^n)               A * n^2n * P              //
    // S = sum of final balances but y                                                                           //
    // P = product of final balances but y                                                                       //
    **************************************************************************************************************/

    // Amount out, so we round down overall.

    // Given that we need to have a greater final balance out, the invariant needs to be rounded up
    const invariant = this._calculateInvariant(
      amplificationParameter,
      balances,
      true,
    );

    const initBalance = balances[tokenIndexIn];
    // Modification: The original code was implemented for a single tokenAmountsIn
    return tokenAmountsIn.map(a => {
      balances[tokenIndexIn] = initBalance + a;

      const finalBalanceOut =
        this._getTokenBalanceGivenInvariantAndAllOtherBalances(
          amplificationParameter,
          balances,
          invariant,
          tokenIndexOut,
        );

      // No need to use checked arithmetic since `tokenAmountIn` was actually added to the same balance right before
      // calling `_getTokenBalanceGivenInvariantAndAllOtherBalances` which doesn't alter the balances array.
      // balances[tokenIndexIn] = balances[tokenIndexIn] - tokenAmountIn;
      return balances[tokenIndexOut] - finalBalanceOut - BigInt(1);
    });
  }

  static _getTokenBalanceGivenInvariantAndAllOtherBalances(
    amplificationParameter: bigint,
    balances: bigint[],
    invariant: bigint,
    tokenIndex: number,
  ): bigint {
    // Rounds result up overall

    const ampTimesTotal = amplificationParameter * BigInt(balances.length);
    let sum = balances[0];
    let P_D = balances[0] * BigInt(balances.length);
    for (let j = 1; j < balances.length; j++) {
      P_D = MathSol.divDown(
        MathSol.mul(MathSol.mul(P_D, balances[j]), BigInt(balances.length)),
        invariant,
      );
      sum = sum + balances[j];
    }
    // No need to use safe math, based on the loop above `sum` is greater than or equal to `balances[tokenIndex]`
    sum = sum - balances[tokenIndex];

    const inv2 = MathSol.mul(invariant, invariant);
    // We remove the balance fromm c by multiplying it
    const c = MathSol.mul(
      MathSol.mul(
        MathSol.divUp(inv2, MathSol.mul(ampTimesTotal, P_D)),
        this._AMP_PRECISION,
      ),
      balances[tokenIndex],
    );
    const b =
      sum +
      MathSol.mul(
        MathSol.divDown(invariant, ampTimesTotal),
        this._AMP_PRECISION,
      );

    // We iterate to find the balance
    let prevTokenBalance = BZERO;
    // We multiply the first iteration outside the loop with the invariant to set the value of the
    // initial approximation.
    let tokenBalance = MathSol.divUp(inv2 + c, invariant + b);

    for (let i = 0; i < 255; i++) {
      prevTokenBalance = tokenBalance;

      tokenBalance = MathSol.divUp(
        MathSol.mul(tokenBalance, tokenBalance) + c,
        MathSol.mul(tokenBalance, BigInt(2)) + b - invariant,
      );

      if (tokenBalance > prevTokenBalance) {
        if (tokenBalance - prevTokenBalance <= 1) {
          return tokenBalance;
        }
      } else if (prevTokenBalance - tokenBalance <= 1) {
        return tokenBalance;
      }
    }

    throw new Error('Errors.STABLE_GET_BALANCE_DIDNT_CONVERGE');
  }
}

export class StablePool extends BaseGeneralPool {
  _onSwapGivenIn(
    tokenAmountsIn: bigint[],
    balances: bigint[],
    indexIn: number,
    indexOut: number,
    _amplificationParameter: bigint,
  ): bigint[] {
    return StableMath._calcOutGivenIn(
      _amplificationParameter,
      balances,
      indexIn,
      indexOut,
      tokenAmountsIn,
    );
  }
}

export class WeightedMath {
  static _MAX_IN_RATIO = BigInt(300000000000000000);
  static _MAX_OUT_RATIO = BigInt(300000000000000000);
  // Computes how many tokens can be taken out of a pool if `amountIn` are sent, given the
  // current balances and weights.
  static _calcOutGivenIn(
    balanceIn: bigint,
    weightIn: bigint,
    balanceOut: bigint,
    weightOut: bigint,
    amountsIn: bigint[],
  ): bigint[] {
    /**********************************************************************************************
    // outGivenIn                                                                                //
    // aO = amountOut                                                                            //
    // bO = balanceOut                                                                           //
    // bI = balanceIn              /      /            bI             \    (wI / wO) \           //
    // aI = amountIn    aO = bO * |  1 - | --------------------------  | ^            |          //
    // wI = weightIn               \      \       ( bI + aI )         /              /           //
    // wO = weightOut                                                                            //
    **********************************************************************************************/

    // Amount out, so we round down overall.

    // The multiplication rounds down, and the subtrahend (power) rounds up (so the base rounds up too).
    // Because bI / (bI + aI) <= 1, the exponent rounds down.

    // Cannot exceed maximum in ratio

    const exponent = MathSol.divDownFixed(weightIn, weightOut);
    return amountsIn.map(amountIn => {
      _require(
        amountIn <= MathSol.mulDownFixed(balanceIn, this._MAX_IN_RATIO),
        'Errors.MAX_IN_RATIO',
      );
      const denominator = balanceIn + amountIn;
      const base = MathSol.divUpFixed(balanceIn, denominator);
      const power = MathSol.powUpFixed(base, exponent);

      return MathSol.mulDownFixed(balanceOut, MathSol.complementFixed(power));
    });
  }
}

export class WeightedPool extends BaseMinimalSwapInfoPool {
  _onSwapGivenIn(
    tokenAmountsIn: bigint[],
    currentBalanceTokenIn: bigint,
    currentBalanceTokenOut: bigint,
    _weightIn: bigint,
    _weightOut: bigint,
  ): bigint[] {
    return WeightedMath._calcOutGivenIn(
      currentBalanceTokenIn,
      _weightIn,
      currentBalanceTokenOut,
      _weightOut,
      tokenAmountsIn,
    );
  }
}
