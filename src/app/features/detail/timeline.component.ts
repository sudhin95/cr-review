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
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.css'],
})
export class TimelineComponent {
  /** Expected to arrive already sorted oldest first (see sortTimeline). */
  @Input({ required: true }) events!: any[];

  verb(action: string): string {
    return VERB[action] ?? action.toLowerCase().replace(/_/g, ' ');
  }
}
