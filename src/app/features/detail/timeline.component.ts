import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

const VERB: Record<string, string> = {
  CREATE: 'created the request',
  SUBMIT: 'submitted the request',
  SEND_FOR_APPROVAL: 'sent the request for approval',
  APPROVE: 'approved',
  REJECT: 'rejected',
  APPLY: 'applied the change',
};

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe],
  template: `
    <ol class="timeline" data-testid="timeline">
      <li *ngFor="let event of events" [attr.data-type]="event.action" data-testid="timeline-event">
        <p class="line">
          <strong>{{ event.byUserId }}</strong> {{ verb(event.action) }}
        </p>
        <time [attr.datetime]="event.at">{{ event.at | date: 'd MMM y, HH:mm' }}</time>
        <p class="note" *ngIf="event.note">{{ event.note }}</p>
      </li>
    </ol>
  `,
  styles: [
    `
      .timeline {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      li {
        position: relative;
        padding: 0 0 1.25rem 1.5rem;
      }
      li::before {
        content: '';
        position: absolute;
        left: 0.3rem;
        top: 0.9rem;
        bottom: 0;
        width: 2px;
        background: var(--line);
      }
      li:last-child::before {
        display: none;
      }
      li::after {
        content: '';
        position: absolute;
        left: 0;
        top: 0.35rem;
        width: 0.7rem;
        height: 0.7rem;
        border-radius: 50%;
        background: var(--paper);
        border: 2px solid var(--ink-soft);
      }
      li[data-type='APPROVE']::after,
      li[data-type='APPLY']::after {
        background: var(--teal);
        border-color: var(--teal);
      }
      li[data-type='REJECT']::after {
        background: var(--crimson);
        border-color: var(--crimson);
      }
      .line {
        margin: 0;
      }
      time {
        font-size: 0.8125rem;
        color: var(--ink-soft);
      }
      .note {
        margin: 0.4rem 0 0;
        padding: 0.5rem 0.75rem;
        background: var(--surface);
        border-radius: 6px;
        font-size: 0.9375rem;
      }
    `,
  ],
})
export class TimelineComponent {
  /** Expected to arrive already sorted oldest first (see sortTimeline). */
  @Input({ required: true }) events!: any[];

  verb(action: string): string {
    return VERB[action] ?? action.toLowerCase().replace(/_/g, ' ');
  }
}
