import { v4 as uuid } from 'uuid';
import DeferrablePromise, { SignalState } from './deferrable-promise';

type Item<T> = {
  id: string;
  metadata: Record<string, any>;
  promise: DeferrablePromise<T>;
  handler: () => Promise<T>;
  next: Item<T> | null;
};

export type QueueItem<T> = {
  id: string;
  metadata: Record<string, any>;
  promise: Promise<T>;
  signal: Promise<SignalState>;
};

export default class PromiseQueue {
  #head: Item<any> | null = null;

  #tail: Item<any> | null = null;

  #length: number = 0;

  add<T>(
    handler: () => Promise<T>,
    metadata?: Record<string, any>,
  ): QueueItem<T> {
    const item: Item<T> = {
      id: uuid(),
      metadata: metadata ?? {},
      promise: new DeferrablePromise<T>(),
      handler,
      next: null,
    };

    if (this.#tail === null) {
      this.#head = item;
      this.#tail = item;
    } else {
      this.#tail.next = item;
      this.#tail = item;
    }
    this.#length += 1;

    if (this.#length === 1) {
      this.#processItem();
    }
    return {
      id: item.id,
      metadata: item.metadata,
      promise: item.promise.promise,
      signal: item.promise.signal,
    };
  }

  remove(id: string): boolean {
    if (this.#head === null) {
      return false;
    }

    if (this.#head.id === id) {
      // The first item is in progress. The only thing we can do is to abort it
      // but we can't directly remove it from the queue
      this.#head.promise.abort();
      return false;
    }
    let cursor = this.#head.next;
    let previous: Item<any> = this.#head;

    while (cursor !== null) {
      if (cursor.id === id) {
        previous.next = cursor.next;
        if (cursor === this.#tail) {
          this.#tail = previous;
        }
        this.#length -= 1;
        cursor.promise.reject(new Error('Item was canceled'));
        return true;
      }
      previous = cursor;
      cursor = cursor.next;
    }
    return false;
  }

  find<T>(
    predicate:
      | string
      | ((item: {
          id: string;
          metadata: Record<string, any>;
          index: number;
        }) => boolean),
  ): QueueItem<T> | undefined {
    let cursor = this.#head;
    const predicateWrapper =
      typeof predicate === 'string'
        ? (item: { id: string }) => item.id === predicate
        : predicate;
    let i = 0;
    while (cursor !== null) {
      if (
        predicateWrapper({ id: cursor.id, metadata: cursor.metadata, index: i })
      ) {
        return {
          id: cursor.id,
          metadata: cursor.metadata,
          promise: cursor.promise.promise,
          signal: cursor.promise.signal,
        };
      }
      cursor = cursor.next;
      i += 1;
    }
    return undefined;
  }

  get length(): number {
    return this.#length;
  }

  #processItem = () => {
    if (this.#head === null) {
      return;
    }
    const item = this.#head;
    item
      .handler()
      .then(item.promise.resolve.bind(item.promise))
      .catch(item.promise.reject.bind(item.promise))
      .finally(() => {
        if (this.#head === item) {
          this.#head = item.next;
          this.#length -= 1;
          item.next = null;

          if (this.#head === null) {
            this.#tail = null;
          }
          this.#processItem();
        }
      })
      .catch(() => {});
  };
}
