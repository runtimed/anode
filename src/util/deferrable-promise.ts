export type SignalState = "abort" | undefined;
export default class DeferrablePromise<T> {
  #promise: Promise<T>;

  #resolve: undefined | ((value: T) => void);

  #reject: undefined | ((reason: any) => void);

  #signalPromise: Promise<SignalState>;

  #signalResolve: undefined | ((value: SignalState) => void);

  constructor() {
    this.#promise = new Promise<T>((resolve, reject) => {
      this.#resolve = resolve;
      this.#reject = reject;
      // There's no race condition between the constructor and calling resolve()
      // because the promise contsructor callback is always called synchronously
    });

    this.#signalPromise = new Promise<SignalState>((resolve) => {
      this.#signalResolve = resolve;
    });
  }

  get promise(): Promise<T> {
    return this.#promise;
  }

  get signal(): Promise<SignalState> {
    return this.#signalPromise;
  }

  resolve(value: T): Promise<T> {
    this.#resolve!(value);
    this.#signalResolve!(undefined);
    return this.#promise;
  }

  reject(reason: any): Promise<T> {
    this.#reject!(reason);
    this.#signalResolve!(undefined);
    return this.#promise;
  }

  abort(): void {
    this.#signalResolve!("abort");
  }
}
