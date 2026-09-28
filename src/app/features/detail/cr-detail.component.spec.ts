import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { clone } from '../../core/clone';
import { CrApiService } from '../../core/cr-api.service';
import { CurrentUserService } from '../../core/current-user.service';
import { details } from '../../core/fixtures';
import { FakeCrApi, flush } from '../../../testing/fake-api';
import { allByTestId, byTestId, click, text } from '../../../testing/dom';
import { CrDetailComponent } from './cr-detail.component';

const PENDING_CR: any = clone(details['CR-1']); // org-alpha, created by alice
const decided = (status: 'APPROVED' | 'REJECTED', note?: string): any => ({
  ...clone(PENDING_CR),
  status,
  audit: [
    ...PENDING_CR.audit,
    {
      action: status === 'APPROVED' ? 'APPROVE' : 'REJECT',
      byUserId: 'mona',
      at: '2026-03-04T10:00:00Z',
      note,
    },
  ],
});

describe('CrDetailComponent', () => {
  let fixture: ComponentFixture<CrDetailComponent>;
  let api: FakeCrApi;
  let users: CurrentUserService;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(() => {
    api = new FakeCrApi();
    params = new BehaviorSubject(convertToParamMap({ id: 'CR-1' }));
    TestBed.configureTestingModule({
      imports: [CrDetailComponent],
      providers: [
        provideRouter([]),
        { provide: CrApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { paramMap: params.asObservable() } },
      ],
    });
    users = TestBed.inject(CurrentUserService);
    fixture = TestBed.createComponent(CrDetailComponent);
    fixture.detectChanges();
  });

  const settle = async () => {
    await flush();
    fixture.detectChanges();
  };
  const loadWith = async (cr: any) => {
    api.getCalls[api.getCalls.length - 1].resolve(cr);
    await settle();
  };
  const button = (id: string) => byTestId(fixture, id) as HTMLButtonElement | null;
  const typeReason = (value: string) => {
    const area = byTestId(fixture, 'reject-reason') as HTMLTextAreaElement;
    area.value = value;
    area.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const submitReject = () => {
    (byTestId(fixture, 'reject-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  describe('loading and errors', () => {
    it('shows loading, then the request', async () => {
      expect(byTestId(fixture, 'detail-loading')).not.toBeNull();
      expect(api.getCalls[0].id).toBe('CR-1');
      expect(api.getCalls[0].user.id).toBe('mona');
      await loadWith(PENDING_CR);
      expect(byTestId(fixture, 'detail-loading')).toBeNull();
      expect(text(byTestId(fixture, 'detail-title'))).toBe(PENDING_CR.title);
    });

    it('shows an error with retry', async () => {
      api.getCalls[0].reject(new Error('Not found'));
      await settle();
      expect(text(byTestId(fixture, 'detail-error'))).toContain('does not exist');
      click(fixture, 'detail-retry');
      expect(byTestId(fixture, 'detail-loading')).not.toBeNull();
      await loadWith(PENDING_CR);
      expect(byTestId(fixture, 'detail-error')).toBeNull();
    });
  });

  describe('diff and timeline', () => {
    it('renders each line with its classification', async () => {
      await loadWith({
        ...PENDING_CR,
        baselineLineItems: [
          { sku: 'KEEP', description: 'Keep', quantity: 1, unitPrice: 1 },
          { sku: 'EDIT', description: 'Edit', quantity: 1, unitPrice: 1 },
          { sku: 'GONE', description: 'Gone', quantity: 2, unitPrice: 5 },
        ],
        proposedLineItems: [
          { sku: 'KEEP', description: 'Keep', quantity: 1, unitPrice: 1 },
          { sku: 'EDIT', description: 'Edit', quantity: 3, unitPrice: 1 },
          { sku: 'NEW', description: 'New', quantity: 1, unitPrice: 2.5 },
        ],
      });
      const rows = allByTestId(fixture, 'diff-row');
      expect(rows.map((r) => r.getAttribute('data-kind'))).toEqual([
        'unchanged',
        'modified',
        'added',
        'removed',
      ]);
      expect(allByTestId(fixture, 'diff-kind').map(text)).toEqual([
        'No change',
        'Changed',
        'Added',
        'Removed',
      ]);
      expect(allByTestId(fixture, 'diff-delta').map(text)).toEqual([
        '—',
        '+$2.00',
        '+$2.50',
        '-$10.00',
      ]);
    });

    it('renders accurate totals, delta and percentage', async () => {
      await loadWith(PENDING_CR);
      expect(text(byTestId(fixture, 'total-before'))).toBe('$8,000.00');
      expect(text(byTestId(fixture, 'total-after'))).toBe('$8,500.00');
      expect(text(byTestId(fixture, 'total-delta'))).toBe('+$500.00');
      expect(text(byTestId(fixture, 'total-delta-pct'))).toBe('+6.3%');
    });

    it('renders the audit trail oldest first even though it is stored newest first', async () => {
      await loadWith(PENDING_CR);
      const events = allByTestId(fixture, 'timeline-event').map(text);
      expect(events[0]).toContain('alice created the request');
      expect(events[1]).toContain('alice submitted the request');
      expect(events[2]).toContain('alice sent the request for approval');
    });
  });

  describe('permission gating', () => {
    it('offers Approve and Reject to an approver on a pending request', async () => {
      await loadWith(PENDING_CR);
      expect(button('approve')).not.toBeNull();
      expect(button('reject')).not.toBeNull();
    });

    it('never offers actions to a read-only user', async () => {
      users.switchTo('val');
      await loadWith(PENDING_CR);
      expect(button('approve')).toBeNull();
      expect(button('reject')).toBeNull();
      expect(text(byTestId(fixture, 'action-blocked'))).toContain('read-only');
    });

    it('refetches as the new user when the user switches after load', async () => {
      await loadWith(PENDING_CR);
      users.switchTo('val');
      fixture.detectChanges();
      expect(api.getCalls).toHaveLength(2);
      expect(api.getCalls[1].user.id).toBe('val');
      await loadWith(PENDING_CR);
      expect(button('approve')).toBeNull();
    });

    it.each(['DRAFT', 'APPLIED', 'APPROVED', 'REJECTED'])(
      'offers no actions on %s requests',
      async (status) => {
        await loadWith({ ...PENDING_CR, status });
        expect(button('approve')).toBeNull();
        expect(text(byTestId(fixture, 'action-blocked'))).toContain('not awaiting approval');
      },
    );

    it('does not call the API if approve() is invoked while not allowed', async () => {
      users.switchTo('val');
      await loadWith(PENDING_CR);
      fixture.componentInstance.approve();
      expect(api.approveCalls).toHaveLength(0);
    });
  });

  describe('approve', () => {
    beforeEach(() => loadWith(PENDING_CR));

    it('disables both actions while in flight and sends only one request on double click', () => {
      click(fixture, 'approve');
      button('approve')?.click();
      fixture.detectChanges();

      expect(api.approveCalls).toHaveLength(1);
      expect(api.approveCalls[0].id).toBe('CR-1');
      expect(api.approveCalls[0].user.id).toBe('mona');
      expect(Number.isNaN(Date.parse(api.approveCalls[0].at))).toBe(false);
      expect(button('approve')?.disabled).toBe(true);
      expect(button('reject')?.disabled).toBe(true);
      expect(text(button('approve'))).toBe('Approving');
    });

    it('shows the new status and history on success and removes the actions', async () => {
      click(fixture, 'approve');
      api.approveCalls[0].resolve(decided('APPROVED'));
      await settle();

      expect(text(byTestId(fixture, 'status-badge'))).toBe('Approved');
      expect(text(byTestId(fixture, 'action-success'))).toContain('You approved');
      expect(button('approve')).toBeNull();
      const events = allByTestId(fixture, 'timeline-event');
      expect(text(events[events.length - 1])).toContain('mona approved');
    });

    it('keeps the previous state and re-enables actions when the call fails', async () => {
      click(fixture, 'approve');
      api.approveCalls[0].reject(new Error('Network error'));
      await settle();

      expect(text(byTestId(fixture, 'action-error'))).toContain('Could not approve');
      expect(text(byTestId(fixture, 'status-badge'))).toBe('Pending approval');
      expect(button('approve')?.disabled).toBe(false);
      expect(text(button('approve'))).toBe('Approve');

      click(fixture, 'approve');
      expect(api.approveCalls).toHaveLength(2);
      expect(byTestId(fixture, 'action-error')).toBeNull();
    });
  });

  describe('reject', () => {
    beforeEach(async () => {
      await loadWith(PENDING_CR);
      click(fixture, 'reject');
    });

    it('requires a reason and does not call the API without one', () => {
      submitReject();
      expect(api.rejectCalls).toHaveLength(0);
      expect(text(byTestId(fixture, 'reject-reason-error'))).toContain('Enter a reason');
      expect(byTestId(fixture, 'reject-reason')?.getAttribute('aria-invalid')).toBe('true');
    });

    it('treats a whitespace-only reason as missing', () => {
      typeReason('    ');
      submitReject();
      expect(api.rejectCalls).toHaveLength(0);
      expect(byTestId(fixture, 'reject-reason-error')).not.toBeNull();
    });

    it('sends the trimmed reason once and shows the result', async () => {
      typeReason('  Price not confirmed in writing.  ');
      submitReject();
      submitReject();

      expect(api.rejectCalls).toHaveLength(1);
      expect(api.rejectCalls[0].reason).toBe('Price not confirmed in writing.');
      expect(text(button('confirm-reject'))).toBe('Rejecting');
      expect(button('cancel-reject')?.disabled).toBe(true);
      expect((byTestId(fixture, 'reject-reason') as HTMLTextAreaElement).disabled).toBe(true);

      api.rejectCalls[0].resolve(decided('REJECTED', 'Price not confirmed in writing.'));
      await settle();

      expect(text(byTestId(fixture, 'status-badge'))).toBe('Rejected');
      expect(byTestId(fixture, 'reject-form')).toBeNull();
      expect(text(byTestId(fixture, 'timeline'))).toContain('Price not confirmed in writing.');
    });

    it('keeps the typed reason and the form open when the call fails', async () => {
      typeReason('Needs a second quote.');
      submitReject();
      api.rejectCalls[0].reject(new Error('Server error'));
      await settle();

      expect(text(byTestId(fixture, 'action-error'))).toContain('Could not reject');
      expect(text(byTestId(fixture, 'status-badge'))).toBe('Pending approval');
      const area = byTestId(fixture, 'reject-reason') as HTMLTextAreaElement;
      expect(area.value).toBe('Needs a second quote.');
      expect(area.disabled).toBe(false);
      expect(button('confirm-reject')?.disabled).toBe(false);
    });

    it('cancel closes the form and clears the reason', () => {
      typeReason('Draft');
      click(fixture, 'cancel-reject');
      expect(byTestId(fixture, 'reject-form')).toBeNull();
      click(fixture, 'reject');
      expect((byTestId(fixture, 'reject-reason') as HTMLTextAreaElement).value).toBe('');
    });
  });

  it('resets decision state and ignores the old response when navigating away', async () => {
    await loadWith(PENDING_CR);
    click(fixture, 'approve');
    params.next(convertToParamMap({ id: 'CR-3' }));
    fixture.detectChanges();
    expect(byTestId(fixture, 'detail-loading')).not.toBeNull();

    api.approveCalls[0].resolve(decided('APPROVED'));
    await loadWith({ ...clone(details['CR-3']), status: 'PENDING_APPROVAL' });
    expect(text(byTestId(fixture, 'detail-title'))).toBe('Extend agreement term');
    expect(byTestId(fixture, 'action-success')).toBeNull();
    expect(button('approve')?.disabled).toBe(false);
  });
});
