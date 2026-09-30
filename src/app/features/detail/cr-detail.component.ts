import { DatePipe, NgIf, NgSwitch, NgSwitchCase } from '@angular/common';
import { Component, DestroyRef, ElementRef, OnInit, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest } from 'rxjs';
import { toUserMessage } from '../../core/api-error';
import { CrApiService } from '../../core/cr-api.service';
import { CurrentUserService } from '../../core/current-user.service';
import { DiffRow, DiffTotals, buildDiff, diffTotals } from '../../core/diff';
import {
  ActionAvailability,
  actionAvailability,
  requesterOf,
  statusLabel,
} from '../../core/permissions';
import { sortTimeline } from '../../core/timeline';
import { DiffTableComponent } from './diff-table.component';
import { TimelineComponent } from './timeline.component';
import { JsonPipe } from '@angular/common';

export type DetailState =
  | { kind: 'loading' }
  | { kind: 'loaded'; vm: DetailViewModel }
  | { kind: 'error'; message: string };

/** Everything derived from one change request, computed once when it arrives. */
export interface DetailViewModel {
  cr: any;
  requester: string | null;
  diff: DiffRow[];
  totals: DiffTotals;
  timeline: any[];
}

export type DecisionAction = 'approve' | 'reject';

export type ActionState =
  | { kind: 'idle' }
  | { kind: 'submitting'; action: DecisionAction }
  | { kind: 'failed'; action: DecisionAction; message: string }
  | { kind: 'succeeded'; action: DecisionAction };

/** Plain data sent with an approve / reject. `reason` is only used for reject. */
export interface DecisionRequest {
  at: string;
  reason?: string;
}

export const REASON_MAX = 500;

function notBlank(control: AbstractControl<string>) {
  return control.value.trim().length ? null : { blank: true };
}

@Component({
  selector: 'app-cr-detail',
  standalone: true,
  imports: [
    NgIf,
    NgSwitch,
    NgSwitchCase,
    RouterLink,
    ReactiveFormsModule,
    DatePipe,
    DiffTableComponent,
    TimelineComponent,
    JsonPipe,
  ],
  templateUrl: './cr-detail.component.html',
  styleUrls: ['./cr-detail.component.css'],
})
export class CrDetailComponent implements OnInit {
  state: DetailState = { kind: 'loading' };
  action: ActionState = { kind: 'idle' };
  user: any;

  rejectOpen = false;
  rejectAttempted = false;
  readonly reasonMax = REASON_MAX;
  readonly statusLabel = statusLabel;
  readonly reason = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, notBlank, Validators.maxLength(REASON_MAX)],
  });
  readonly rejectForm = new FormGroup({ reason: this.reason });

  @ViewChild('reasonInput') reasonInput?: ElementRef<HTMLTextAreaElement>;

  private crId = '';
  /** Bumped on every load / navigation so a late Promise from an older request is ignored. */
  private loadSeq = 0;
  private actionSeq = 0;
  private destroyed = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: CrApiService,
    private readonly users: CurrentUserService,
    private readonly destroyRef: DestroyRef,
  ) {
    this.user = users.user;
    destroyRef.onDestroy(() => (this.destroyed = true));
  }

  ngOnInit(): void {
    // The API is org-scoped, so switching user must refetch as well as navigating.
    combineLatest([this.route.paramMap, this.users.user$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([params, user]) => {
        this.crId = params.get('id') ?? '';
        this.user = user;
        this.resetDecision();
        this.load();
      });
  }

  get vm(): DetailViewModel | null {
    return this.state.kind === 'loaded' ? this.state.vm : null;
  }

  /** Status AND policy. Recomputed on every check so switching user updates the page. */
  get availability(): ActionAvailability | null {
    const vm = this.vm;
    return vm ? actionAvailability(vm.cr, this.user) : null;
  }

  get blockedReason(): string | null {
    const a = this.availability;
    return a && !a.canAct ? a.reason : null;
  }

  get isSubmitting(): boolean {
    return this.action.kind === 'submitting';
  }

  submittingAction(action: DecisionAction): boolean {
    return this.action.kind === 'submitting' && this.action.action === action;
  }

  get loadError(): string {
    return this.state.kind === 'error' ? this.state.message : '';
  }

  get successMessage(): string | null {
    if (this.action.kind !== 'succeeded') return null;
    const verb = this.action.action === 'approve' ? 'approved' : 'rejected';
    return `You ${verb} this change request.`;
  }

  get actionError(): string | null {
    return this.action.kind === 'failed' ? this.action.message : null;
  }

  get reasonError(): string | null {
    if (!this.rejectAttempted && !this.reason.touched) return null;
    if (this.reason.hasError('required') || this.reason.hasError('blank')) {
      return 'Enter a reason so the requester knows what to change.';
    }
    if (this.reason.hasError('maxlength')) {
      return `Keep the reason under ${REASON_MAX} characters.`;
    }
    return null;
  }

  load(): void {
    const seq = ++this.loadSeq;
    this.state = { kind: 'loading' };
    this.api.getChangeRequest(this.user, this.crId).then(
      (cr) => {
        if (this.isCurrentLoad(seq)) this.showCr(cr);
      },
      (err: unknown) => {
        if (!this.isCurrentLoad(seq)) return;
        this.state = {
          kind: 'error',
          message: toUserMessage(err, 'This change request could not be loaded.'),
        };
      },
    );
  }

  approve(): void {
    if (!this.canStart()) return;
    this.submit('approve', { at: new Date().toISOString() });
  }

  openReject(): void {
    if (!this.canStart()) return;
    this.rejectOpen = true;
    if (this.action.kind === 'failed') this.action = { kind: 'idle' };
    // queueMicrotask(() => this.reasonInput?.nativeElement.focus());
  }

  cancelReject(): void {
    if (this.isSubmitting) return;
    this.rejectOpen = false;
    this.rejectAttempted = false;
    this.reason.reset('');
  }

  confirmReject(): void {
    this.rejectAttempted = true;
    this.reason.markAsTouched();
    console.log(this.reason.invalid);
    if (this.reason.invalid) {
      this.reasonInput?.nativeElement.focus();
      return;
    }
    if (!this.canStart()) return;
    const reason = this.reason.value.trim();
    this.submit('reject', { at: new Date().toISOString(), reason });
  }

  /** Blocks invalid (status/policy) and duplicate (already in flight) actions. */
  private canStart(): boolean {
    return !this.isSubmitting && this.availability?.canAct === true;
  }

  private submit(action: DecisionAction, request: DecisionRequest): void {
    const seq = ++this.actionSeq;
    this.action = { kind: 'submitting', action };
    this.reason.disable({ emitEvent: false });
    const call =
      action === 'approve'
        ? this.api.approve(this.user, this.crId, request.at)
        : this.api.reject(this.user, this.crId, request.at, request.reason ?? '');
    call.then(
      (updated) => {
        if (!this.isCurrentAction(seq)) return;
        this.showCr(updated);
        this.rejectOpen = false;
        this.rejectAttempted = false;
        this.reason.reset('');
        this.reason.enable({ emitEvent: false });
        this.action = { kind: 'succeeded', action };
      },
      (err: any) => {
        if (!this.isCurrentAction(seq)) return;
        // Keep the last known CR on screen; the server state did not change.
        this.reason.enable({ emitEvent: false });
        this.action = {
          kind: 'failed',
          action,
          message: toUserMessage(err, `Could not ${action} this change request.`),
        };
      },
    );
  }

  private isCurrentLoad(seq: number): boolean {
    return !this.destroyed && seq === this.loadSeq;
  }

  private isCurrentAction(seq: number): boolean {
    return !this.destroyed && seq === this.actionSeq;
  }

  private showCr(cr: any): void {
    const diff = buildDiff(cr.baselineLineItems ?? [], cr.proposedLineItems ?? []);
    this.state = {
      kind: 'loaded',
      vm: {
        cr,
        requester: requesterOf(cr),
        diff,
        totals: diffTotals(diff),
        timeline: sortTimeline(cr.audit ?? []),
      },
    };
    console.log('showCr', this.state);
  }

  private resetDecision(): void {
    this.actionSeq++; // drop any in-flight decision from the previous request / user
    this.action = { kind: 'idle' };
    this.rejectOpen = false;
    this.rejectAttempted = false;
    this.reason.reset('');
    this.reason.enable({ emitEvent: false });
  }
}
