export interface Deferred<T = any> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (err: unknown) => void;
}

function deferred<T = any>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Stands in for CrApiService. Each call returns a pending Promise the test resolves or rejects
 * when it chooses, which lets tests assert on the in-flight (slow) state explicitly.
 */
export class FakeCrApi {
  listCalls: (Deferred<any[]> & { user: any })[] = [];
  getCalls: (Deferred & { user: any; id: string })[] = [];
  approveCalls: (Deferred & { user: any; id: string; at: string })[] = [];
  rejectCalls: (Deferred & { user: any; id: string; at: string; reason: string })[] = [];

  listChangeRequests(user: any): Promise<any[]> {
    const d = { ...deferred<any[]>(), user };
    this.listCalls.push(d);
    return d.promise;
  }

  getChangeRequest(user: any, id: string): Promise<any> {
    const d = { ...deferred(), user, id };
    this.getCalls.push(d);
    return d.promise;
  }

  approve(user: any, id: string, at: string): Promise<any> {
    const d = { ...deferred(), user, id, at };
    this.approveCalls.push(d);
    return d.promise;
  }

  reject(user: any, id: string, at: string, reason: string): Promise<any> {
    const d = { ...deferred(), user, id, at, reason };
    this.rejectCalls.push(d);
    return d.promise;
  }
}

/** Lets pending Promise callbacks run. */
export const flush = () => new Promise<void>((resolve) => setTimeout(resolve));
