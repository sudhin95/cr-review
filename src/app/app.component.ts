import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CurrentUserService } from './core/current-user.service';
import { APPROVE_POLICY } from './core/permissions';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, FormsModule, AsyncPipe, NgIf, NgFor],
  template: `
    <header class="shell-header">
      <a routerLink="/change-requests" class="brand">
        <span class="brand-mark" aria-hidden="true"></span>
        <span>penny <span class="brand-sub">Change requests</span></span>
      </a>
      <label class="who" *ngIf="userService.user$ | async as user">
        <span class="visually-hidden">Signed in as</span>
        <select
          [ngModel]="user.id"
          (ngModelChange)="userService.switchTo($event)"
          aria-label="Signed in as"
        >
          <option *ngFor="let u of userService.users" [value]="u.id">
            {{ u.id }} ({{ u.orgCode }}, {{ roleOf(u) }})
          </option>
        </select>
      </label>
    </header>

    <main class="shell-main">
      <router-outlet />
    </main>
  `,
  styles: [
    `
      .shell-header {
        position: sticky;
        top: 0;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        padding: 0.75rem clamp(1rem, 4vw, 2.5rem);
        background: var(--ink);
        color: #fff;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        color: inherit;
        text-decoration: none;
        font-weight: 700;
        font-size: 1.25rem;
        letter-spacing: -0.01em;
      }
      .brand-sub {
        font-weight: 400;
        opacity: 0.75;
        font-size: 1rem;
        margin-left: 0.35rem;
      }
      .brand-mark {
        width: 1.4rem;
        height: 1.4rem;
        border-radius: 50%;
        background:
          radial-gradient(circle at 30% 30%, var(--crimson) 0 34%, transparent 35%),
          radial-gradient(circle at 75% 28%, var(--teal) 0 24%, transparent 25%),
          radial-gradient(circle at 62% 72%, var(--amber) 0 38%, transparent 39%);
      }
      .who {
        flex: 0 1 auto;
        min-width: 0;
        max-width: 100%;
      }
      .who select {
        width: 100%;
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 8px;
        padding: 0.4rem 0.6rem;
        max-width: 100%;
      }
      .who option {
        color: var(--ink);
      }
      .shell-main {
        max-width: 72rem;
        margin: 0 auto;
        padding: clamp(1.25rem, 3vw, 2.5rem) clamp(1rem, 4vw, 2.5rem) 6rem;
      }
    `,
  ],
})
export class AppComponent {
  constructor(readonly userService: CurrentUserService) {}

  roleOf(user: any): string {
    return user.policies.includes(APPROVE_POLICY) ? 'approver' : 'read-only';
  }
}
