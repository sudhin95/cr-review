import { Injectable } from '@angular/core';
import { details as fixtureDetails, summaries as fixtureSummaries } from './fixtures';

/**
 * Mock API service standing in for the real HTTP service. It is org-scoped (returns only the
 * caller's org), supports injectable latency, and can be told to fail the next call so the UI's
 * loading/error handling can be exercised.
 *
 * You do NOT need a backend — treat this as the contract your components talk to. (In production
 * this would be an HttpClient-backed service returning Observables; here it returns Promises that
 * resolve on a timer, so they integrate cleanly with Angular's async testing.)
 */
@Injectable({ providedIn: 'root' })
export class CrApiService {
  private detailStore: Record<string, any> = JSON.parse(JSON.stringify(fixtureDetails));
  /** Set > 0 to simulate network latency (ms). */
  latencyMs = 0;
  /** When true, the NEXT call rejects with a network error, then resets. */
  failNext = false;

  private settle<T>(value: T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      setTimeout(() => {
        if (this.failNext) {
          this.failNext = false;
          reject(new Error('Network error'));
          return;
        }
        resolve(value);
      }, this.latencyMs);
    });
  }

  private fail<T>(message: string): Promise<T> {
    return new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), this.latencyMs));
  }

  listChangeRequests(user: any): Promise<any[]> {
    const rows = fixtureSummaries
      .filter((s) => s.orgCode === user.orgCode)
      .map((s) => {
        const d = this.detailStore[s.id];
        return d
          ? { id: d.id, title: d.title, status: d.status, orgCode: d.orgCode, delta: d.delta, currency: d.currency, updatedAt: d.updatedAt }
          : { ...s };
      });
    return this.settle(rows);
  }

  getChangeRequest(user: any, id: string): Promise<any> {
    const cr = this.detailStore[id];
    if (!cr || cr.orgCode !== user.orgCode) return this.fail<any>('Not found');
    return this.settle({ ...cr });
  }

  approve(user: any, id: string, at: string): Promise<any> {
    return this.transition(user, id, 'APPROVED', 'APPROVE', at);
  }

  reject(user: any, id: string, at: string, reason: string): Promise<any> {
    return this.transition(user, id, 'REJECTED', 'REJECT', at, reason);
  }

  private transition(user: any, id: string, status: string, action: string, at: string, note?: string): Promise<any> {
    const cr = this.detailStore[id];
    if (!cr || cr.orgCode !== user.orgCode) return this.fail<any>('Not found');
    const updated = { ...cr, status, updatedAt: at, audit: [...cr.audit, { action, byUserId: user.id, at, note }] };
    this.detailStore[id] = updated;
    return this.settle({ ...updated });
  }
}
