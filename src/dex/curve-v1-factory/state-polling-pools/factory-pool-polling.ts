import { Interface, JsonFragment } from '@ethersproject/abi';
import { Logger } from 'log4js';
import { MultiCallParams, MultiResult } from '../../../lib/multi-wrapper';
import { FactoryImplementationNames, PoolConstants, PoolState } from '../types';
import { PoolPollingBase, MulticallReturnedTypes } from './pool-polling-base';
import FactoryCurveV1ABI from '../../../abi/curve-v1-factory/FactoryCurveV1.json';
import { generalDecoder, uint256ToBigInt } from '../../../lib/decoders';
import { BytesLike } from 'ethers/lib/utils';
import { funcName } from '../../../utils';
import { Address } from 'paraswap-core';
import { BigNumber } from 'ethers';

export class FactoryStateHandler extends PoolPollingBase {
  constructor(
    readonly logger: Logger,
    readonly dexKey: string,
    readonly implementationName: FactoryImplementationNames,
    readonly address: Address,
    readonly factoryAddress: Address,
    readonly poolIdentifier: string,
    readonly poolConstants: PoolConstants,
    readonly isSrcFeeOnTransferSupported: boolean,
    private basePoolStateFetcher?: PoolPollingBase,
    private factoryIface: Interface = new Interface(
      FactoryCurveV1ABI as JsonFragment[],
    ),
  ) {
    super(
      logger,
      dexKey,
      implementationName,
      poolIdentifier,
      poolConstants,
      address,
      '/factory',
      basePoolStateFetcher,
      isSrcFeeOnTransferSupported,
    );

    if (this.isMetaPool && this.basePoolStateFetcher === undefined) {
      throw new Error(
        `${this.fullName}: is instantiated with error. basePoolStateFetcher is not provided`,
      );
    }
  }

  getStateMultiCalldata(): MultiCallParams<MulticallReturnedTypes>[] {
    const calls = [
      {
        target: this.factoryAddress,
        callData: this.factoryIface.encodeFunctionData('get_A', [this.address]),
        decodeFunction: uint256ToBigInt,
      },
      {
        target: this.factoryAddress,
        callData: this.factoryIface.encodeFunctionData('get_fees', [
          this.address,
        ]),
        decodeFunction: uint256ToBigInt,
      },
      {
        target: this.factoryAddress,
        callData: this.factoryIface.encodeFunctionData('get_balances', [
          this.address,
        ]),
        decodeFunction: (result: MultiResult<BytesLike>) =>
          generalDecoder(result, ['uint256[4]'], [0n, 0n, 0n, 0n], parsed =>
            parsed[0].map((p: BigNumber) => BigInt(p.toString())),
          ),
      },
    ];
    return calls;
  }

  setState(
    multiOutputs: MultiResult<MulticallReturnedTypes>[],
    updatedAt: number,
  ): void {
    if (!multiOutputs.every(o => o.success)) {
      this.logger.error(
        `${this.dexKey} ${funcName()}: Some of the calls to ${
          this.address
        } generate state failed: `,
      );
      // No need to update with corrupted state
      return;
    }

    const [A, fees, balances] = multiOutputs.map(o => o.returnData) as [
      bigint,
      bigint[],
      bigint[],
    ];

    let basePoolState: PoolState | undefined;
    if (this.isMetaPool) {
      // Check for undefined done in constructor
      const retrievedBasePoolState = this.basePoolStateFetcher!.getState();

      if (retrievedBasePoolState === null) {
        this.logger.error(
          `${this.CLASS_NAME} ${this.dexKey} ${this.address}: Can not retrieve base pool state`,
        );
        return;
      }
      basePoolState = retrievedBasePoolState;
    }

    const newState: PoolState = {
      A,
      fee: fees[0], // Array has [fee, adminFee], but we want only fee
      balances: balances,
      constants: this.poolConstants,
      basePoolState,
    };

    this._setState(newState, updatedAt);
  }
}
