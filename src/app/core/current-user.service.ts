import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { users as USERS } from './fixtures';

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  readonly users: readonly any[] = Object.values(USERS);
  private readonly userSubject = new BehaviorSubject<any>(USERS['approver']);
  readonly user$ = this.userSubject.asObservable();

  get user(): any {
    return this.userSubject.value;
  }

  switchTo(userId: string): void {
    const next = this.users.find((u) => u.id === userId);
    if (next) this.userSubject.next(next);
  }
}
