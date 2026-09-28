import { Component, Input } from '@angular/core';
import { statusLabel } from '../core/permissions';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="badge" [attr.data-status]="status" data-testid="status-badge">{{
    label
  }}</span>`,
  styles: [
    `
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.4em;
        padding: 0.15em 0.6em 0.15em 0.5em;
        border-radius: 999px;
        font-size: 0.8125rem;
        font-weight: 600;
        white-space: nowrap;
        background: var(--surface);
        color: var(--ink);
      }
      .badge::before {
        content: '';
        width: 0.5em;
        height: 0.5em;
        border-radius: 50%;
        background: currentColor;
      }
      [data-status='PENDING_APPROVAL'] {
        background: var(--amber-soft);
        color: var(--amber-ink);
      }
      [data-status='APPROVED'],
      [data-status='APPLIED'] {
        background: var(--teal-soft);
        color: var(--teal);
      }
      [data-status='REJECTED'] {
        background: var(--crimson-soft);
        color: var(--crimson);
      }
    `,
  ],
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: string;
  get label(): string {
    return statusLabel(this.status);
  }
}
