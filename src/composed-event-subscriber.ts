import { StatefulEventSubscriber } from './stateful-event-subscriber';
import { AsyncOrSync, DeepReadonly } from 'ts-essentials';
import {
  Address,
  BlockHeader,
  Log,
  Logger,
  MultiCallInput,
  MultiCallOutput,
} from './types';
import { Lens } from './lens';
import { IDexHelper } from './dex-helper/idex-helper';

export abstract class PartialEventSubscriber<State, SubState> {
  constructor(
    public addressesSubscribed: Address[],
    public lens: Lens<DeepReadonly<State>, DeepReadonly<SubState>>,
    protected logger: Logger,
  ) {}

  public abstract processLog(
    state: DeepReadonly<SubState>,
    log: Readonly<Log>,
    blockHeader: Readonly<BlockHeader>,
  ): AsyncOrSync<DeepReadonly<SubState> | null>;

  public abstract getGenerateStateMultiCallInputs(): MultiCallInput[];

  public abstract generateState(
    multicallOutputs: MultiCallOutput[],
    blockNumber?: number | 'latest',
  ): AsyncOrSync<DeepReadonly<SubState>>;
}

export abstract class ComposedEventSubscriber<
  State,
> extends StatefulEventSubscriber<State> {
  public addressesSubscribed: Address[];
  private addressSubscribers: {
    [address: string]: PartialEventSubscriber<State, any>[];
  } = {};
  private multiCallInputs: MultiCallInput[];
  private multiCallSlices: [number, number][] = [];

  constructor(
    name: string,
    logger: Logger,
    protected dexHelper: IDexHelper,
    private parts: PartialEventSubscriber<State, any>[],
    private blankState: DeepReadonly<State>,
  ) {
    super(name, logger);

    this.addressesSubscribed = [];
    for (const p of this.parts) {
      for (const a of p.addressesSubscribed) {
        const k = a.toLowerCase();
        if (!this.addressSubscribers[k]) {
          this.addressSubscribers[k] = [];
          this.addressesSubscribed.push(a);
        }
        this.addressSubscribers[k].push(p);
      }
    }

    const multiCallInputArrays = this.parts.map(p =>
      p.getGenerateStateMultiCallInputs(),
    );
    let i = 0;
    for (const arr of multiCallInputArrays) {
      this.multiCallSlices.push([i, i + arr.length]);
      i += arr.length;
    }
    this.multiCallInputs = multiCallInputArrays.flat();
  }

  protected async processLog(
    state: DeepReadonly<State>,
    log: Readonly<Log>,
    blockHeader: Readonly<BlockHeader>,
  ): Promise<DeepReadonly<State> | null> {
    const ps = this.addressSubscribers[log.address.toLowerCase()];
    if (!ps) {
      this.logger.error(
        `ComposedEventSubscriber ${this.name} got log with unexpected address ${log.address}`,
      );
      return null;
    }
    let newState: DeepReadonly<State> | null = null;
    for (const p of ps) {
      const result: any = await p.processLog(
        p.lens.get()(newState || state),
        log,
        blockHeader,
      );
      if (result) newState = p.lens.set(result)(newState || state);
    }
    return newState;
  }

  public async generateState(
    blockNumber?: number | 'latest',
  ): Promise<DeepReadonly<State>> {
    let returnData: MultiCallOutput[] = [];
    if (this.multiCallInputs.length) {
      returnData = (
        await this.dexHelper.multiContract.methods
          .aggregate(this.multiCallInputs)
          .call({}, blockNumber)
      ).returnData;
    }
    const stateParts = await Promise.all(
      this.parts.map((p, i) =>
        p.generateState(
          returnData.slice(...this.multiCallSlices[i]),
          blockNumber,
        ),
      ),
    );
    return this.parts.reduce(
      (acc, p, i) => p.lens.set(stateParts[i])(acc),
      this.blankState,
    );
  }
}
