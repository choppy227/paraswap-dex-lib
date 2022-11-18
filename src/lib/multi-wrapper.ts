import _ from 'lodash';
import { Logger } from 'log4js';
import { Contract } from 'web3-eth-contract';

export type MultiResult<T> = {
  success: boolean;
  returnData: T;
};

export type MultiCallParams<T> = {
  target: string;
  callData: string;
  decodeFunction: (str: MultiResult<string> | string) => T;
  cb?: (data: T) => void;
};

export class MultiWrapper {
  /* eslint-disable-next-line */
  constructor(private multi: Contract, private logger: Logger) {}

  async aggregate<T>(
    calls: MultiCallParams<T>[],
    blockNumber?: number | string,
    batchSize: number = 500,
  ): Promise<T[]> {
    const aggregatedResult = await Promise.all(
      _.chunk(calls, batchSize).map(async batch =>
        this.multi.methods.aggregate(batch).call(undefined, blockNumber),
      ),
    );

    let globalInd = 0;
    const resultsUndecoded: string[] = new Array(calls.length);
    for (const res of aggregatedResult) {
      for (const element of res.returnData) {
        resultsUndecoded[globalInd++] = element;
      }
    }

    const results: T[] = new Array(resultsUndecoded.length);
    for (const [i, undecodedElement] of resultsUndecoded.entries()) {
      results[i] = calls[i].decodeFunction(undecodedElement);
      calls[i].cb?.(results[i]);
    }

    return results;
  }

  async tryAggregate<T>(
    mandatory: boolean,
    calls: MultiCallParams<T>[],
    blockNumber?: number | string,
    batchSize: number = 500,
  ): Promise<MultiResult<T>[]> {
    const allCalls = new Array(Math.ceil(calls.length / batchSize));
    for (let i = 0; i < calls.length; i += batchSize) {
      const batch = calls.slice(i, i + batchSize);
      allCalls[Math.floor(i / batchSize)] = batch;
    }

    const aggregatedResult = await Promise.all(
      allCalls.map(batch =>
        this.multi.methods
          .tryAggregate(mandatory, batch)
          .call(undefined, blockNumber),
      ),
    );

    let globalInd = 0;
    const resultsUndecoded: MultiResult<string>[] = new Array(calls.length);
    for (const res of aggregatedResult) {
      for (const element of res) {
        resultsUndecoded[globalInd++] = element;
      }
    }

    const results: MultiResult<T>[] = new Array(resultsUndecoded.length);
    for (const [i, undecodedElement] of resultsUndecoded.entries()) {
      if (!undecodedElement.success) {
        this.logger.error(
          `Multicall request number ${i} for ${calls[i].target} failed`,
        );

        results[i] = {
          success: false,
        } as MultiResult<T>;
        continue;
      }

      results[i] = {
        success: true,
        returnData: calls[i].decodeFunction(undecodedElement.returnData),
      } as MultiResult<T>;

      calls[i].cb?.(results[i].returnData);
    }

    return results;
  }
}
