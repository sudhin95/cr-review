import { DatePipe, NgFor, NgIf, NgSwitch, NgSwitchCase } from '@angular/common';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toUserMessage } from '../../core/api-error';
import { CrApiService } from '../../core/cr-api.service';
import { CurrentUserService } from '../../core/current-user.service';
import { statusLabel } from '../../core/permissions';
import { MoneyPipe } from '../../shared/money.pipe';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

export type ListState =
  | { kind: 'loading' }
  | { kind: 'loaded'; rows: any[] }
  | { kind: 'error'; message: string };

export const CR_STATUSES = ['PENDING_APPROVAL', 'DRAFT', 'APPROVED', 'REJECTED', 'APPLIED'];

@Component({
  selector: 'app-cr-list',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgSwitch,
    NgSwitchCase,
    FormsModule,
    RouterLink,
    DatePipe,
    MoneyPipe,
    StatusBadgeComponent,
  ],
  templateUrl: './cr-list.component.html',
  styleUrls: ['./cr-list.component.css'],
})
export class CrListComponent implements OnInit {
  state: ListState = { kind: 'loading' };
  statusFilter = 'PENDING_APPROVAL';
  readonly filterOptions = ['ALL', ...CR_STATUSES];
  readonly skeletonRows = [1, 2, 3, 4];

  /** Bumped on every load so a slow earlier response cannot overwrite a newer one. */
  private loadSeq = 0;
  private destroyed = false;

  constructor(
    private readonly api: CrApiService,
    private readonly users: CurrentUserService,
    private readonly destroyRef: DestroyRef,
  ) {
    destroyRef.onDestroy(() => (this.destroyed = true));
  }

  ngOnInit(): void {
    // The API is org-scoped, so switching user reloads the list.
    this.users.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  /** Rows after the status filter. Empty unless data has loaded. */
  get visibleRows(): any[] {
    if (this.state.kind !== 'loaded') return [];
    const filter = this.statusFilter;
    return filter === 'ALL' ? this.state.rows : this.state.rows.filter((r) => r.status === filter);
  }

  get hasAnyRows(): boolean {
    return this.state.kind === 'loaded' && this.state.rows.length > 0;
  }

  countFor(filter: string): number {
    if (this.state.kind !== 'loaded') return 0;
    return filter === 'ALL'
      ? this.state.rows.length
      : this.state.rows.filter((r) => r.status === filter).length;
  }

  labelFor(filter: string): string {
    return filter === 'ALL' ? 'All' : statusLabel(filter);
  }

  setFilter(filter: string): void {
    this.statusFilter = filter;
  }

  load(): void {
    const seq = ++this.loadSeq;
    this.state = { kind: 'loading' };
    this.api.listChangeRequests(this.users.user).then(
      (rows) => {
        if (this.isCurrent(seq)) this.state = { kind: 'loaded', rows };
      },
      (err: unknown) => {
        if (!this.isCurrent(seq)) return;
        this.state = {
          kind: 'error',
          message: toUserMessage(err, 'Change requests could not be loaded.'),
        };
      },
    );
  }

  trackById(_: number, row: any): string {
    return row.id;
  }

  private isCurrent(seq: number): boolean {
    return !this.destroyed && seq === this.loadSeq;
  }
}
