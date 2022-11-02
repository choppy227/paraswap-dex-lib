import _ from 'lodash';
import { Logger } from 'log4js';
import { IDexHelper } from '../../dex-helper';
import { TaskScheduler } from '../../lib/task-scheduler';
import {
  STATE_UPDATE_FREQUENCY_MS,
  STATE_UPDATE_RETRY_FREQUENCY_MS,
} from './constants';
import { PriceHandler } from './price-handlers/price-handler';
import { BasePoolPolling } from './state-polling-pools/base-pool-polling';
import { StatePollingManager } from './state-polling-pools/polling-manager';
import { ImplementationNames } from './types';

export class CurveV1FactoryPoolManager {
  // This is needed because we initialize all factory pools + 3 custom pools
  // That 3 custom pools are not fully supported. I need them only in meta pools
  // to get poolState, but not for pricing requests.
  // It appears from CurveV1 and CurveV1Factory duality
  private poolsForOnlyState: Record<string, BasePoolPolling> = {};

  // poolsForOnly State and statePollingPoolsFromId must not have overlapping in pool
  private statePollingPoolsFromId: Record<string, BasePoolPolling> = {};

  // This is fast lookup table when you look for pair and searching for coins in all pools
  private coinAddressesToPoolIdentifiers: Record<string, string[]> = {};

  private allPriceHandlers: Record<string, PriceHandler>;

  private statePollingManager = StatePollingManager;
  private taskScheduler: TaskScheduler;

  constructor(
    private name: string,
    private logger: Logger,
    private dexHelper: IDexHelper,
    stateUpdateFrequency: number = STATE_UPDATE_FREQUENCY_MS,
    stateUpdateRetryFrequency: number = STATE_UPDATE_RETRY_FREQUENCY_MS,
  ) {
    this.taskScheduler = new TaskScheduler(
      this.name,
      this.logger,
      this.updatePollingPoolsInBatch.bind(this),
      stateUpdateFrequency,
      stateUpdateRetryFrequency,
    );

    this.allPriceHandlers = Object.values(ImplementationNames).reduce<
      Record<string, PriceHandler>
    >((acc, curr) => {
      acc[curr] = new PriceHandler(this.logger, curr);
      return acc;
    }, {});
  }

  initializePollingPools() {
    // Execute and start timer
    this.taskScheduler.setTimer(0);
  }

  updatePollingPoolsInBatch() {
    this.statePollingManager.updatePoolsInBatch(
      this.dexHelper.multiWrapper,
      Object.values(this.statePollingPoolsFromId).concat(
        Object.values(this.poolsForOnlyState),
      ),
    );
  }

  getPriceHandler(implementationName: string): PriceHandler {
    return this.allPriceHandlers[implementationName];
  }

  releaseResources() {
    this.taskScheduler.releaseResources();
  }

  initializeNewPool(identifier: string, pool: BasePoolPolling) {
    if (
      this.statePollingPoolsFromId[identifier] ||
      this.poolsForOnlyState[identifier]
    ) {
      throw new Error(
        `${this.name}: pool with ${identifier} is already initialized`,
      );
    }

    this.statePollingPoolsFromId[identifier] = pool;

    const allCoins = pool.poolConstants.COINS.concat(pool.underlyingCoins);
    // It is not quite efficient, but since it is done only on init part,
    // I think it should be ok
    allCoins.forEach(c => {
      const identifiers = this.coinAddressesToPoolIdentifiers[c];
      if (identifiers === undefined) {
        this.coinAddressesToPoolIdentifiers[c] = [identifier];
      } else {
        this.coinAddressesToPoolIdentifiers[c].push(identifier);
        this.coinAddressesToPoolIdentifiers[c] = _.uniq(
          this.coinAddressesToPoolIdentifiers[c],
        );
      }
    });
  }

  initializeNewPoolForState(identifier: string, pool: BasePoolPolling) {
    if (
      this.statePollingPoolsFromId[identifier] ||
      this.poolsForOnlyState[identifier]
    ) {
      throw new Error(
        `${this.name}: pool with ${identifier} is already initialized`,
      );
    }
    this.poolsForOnlyState[identifier] = pool;
  }

  getPoolsForPair(
    srcTokenAddress: string,
    destTokenAddress: string,
    isSrcFeeOnTransferToBeExchanged?: boolean,
  ): BasePoolPolling[] {
    const inSrcTokenIdentifiers =
      this.coinAddressesToPoolIdentifiers[srcTokenAddress];
    const inDestTokenIdentifiers =
      this.coinAddressesToPoolIdentifiers[destTokenAddress];

    // I am not sure about this intersection. Maybe better take pool with longer
    // elements and use only that? Because while doing intersection, it still
    // iterates on all elements since we are not using any hashed structure like Set
    let intersectedPoolIdentifiersSubset: string[] = [];
    if (inSrcTokenIdentifiers && inDestTokenIdentifiers) {
      intersectedPoolIdentifiersSubset = _.intersection(
        inSrcTokenIdentifiers,
        inDestTokenIdentifiers,
      );
    }

    const pools = intersectedPoolIdentifiersSubset
      .map(identifier =>
        this.getPool(
          identifier,
          isSrcFeeOnTransferToBeExchanged
            ? isSrcFeeOnTransferToBeExchanged
            : false,
        ),
      )
      .filter((p): p is BasePoolPolling => {
        if (p === null) {
          return false;
        }
        const iC = p.poolConstants.COINS.indexOf(srcTokenAddress);
        const jC = p.poolConstants.COINS.indexOf(destTokenAddress);

        if (iC !== -1 && jC !== -1) {
          return true;
        }

        const iU = p.underlyingCoins.indexOf(srcTokenAddress);
        const jU = p.underlyingCoins.indexOf(destTokenAddress);

        return iU !== -1 && jU !== -1;
      });

    return pools;
  }

  getPool(
    identifier: string,
    isSrcFeeOnTransferTokenToBeExchanged: boolean,
  ): BasePoolPolling | null {
    const pool = this.statePollingPoolsFromId[identifier.toLowerCase()];
    if (pool !== undefined) {
      if (
        isSrcFeeOnTransferTokenToBeExchanged &&
        pool.isSrcFeeOnTransferSupported
      ) {
        return pool;
      } else if (!isSrcFeeOnTransferTokenToBeExchanged) {
        return pool;
      }
    }
    const fromStateOnlyPools = this.poolsForOnlyState[identifier.toLowerCase()];
    if (fromStateOnlyPools !== undefined) {
      if (
        isSrcFeeOnTransferTokenToBeExchanged &&
        fromStateOnlyPools.isSrcFeeOnTransferSupported
      ) {
        return fromStateOnlyPools;
      } else if (!isSrcFeeOnTransferTokenToBeExchanged) {
        return fromStateOnlyPools;
      }
    }

    return null;
  }
}
