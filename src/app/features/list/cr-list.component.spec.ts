import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CrApiService } from '../../core/cr-api.service';
import { CurrentUserService } from '../../core/current-user.service';
import { FakeCrApi, flush } from '../../../testing/fake-api';
import { allByTestId, byTestId, click, text } from '../../../testing/dom';
import { CrListComponent } from './cr-list.component';

const row = (id: string, status: string): any => ({
  id,
  title: `Request ${id}`,
  status,
  orgCode: 'org-alpha',
  delta: 12.34,
  currency: 'USD',
  updatedAt: '2026-09-01T00:00:00Z',
});

const ROWS = [
  row('CR-1', 'PENDING_APPROVAL'),
  row('CR-2', 'APPROVED'),
  row('CR-3', 'PENDING_APPROVAL'),
  row('CR-4', 'REJECTED'),
];

describe('CrListComponent', () => {
  let fixture: ComponentFixture<CrListComponent>;
  let component: CrListComponent;
  let api: FakeCrApi;
  let users: CurrentUserService;

  beforeEach(() => {
    api = new FakeCrApi();
    TestBed.configureTestingModule({
      imports: [CrListComponent],
      providers: [provideRouter([]), { provide: CrApiService, useValue: api }],
    });
    users = TestBed.inject(CurrentUserService);
    fixture = TestBed.createComponent(CrListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const loadWith = async (rows: any[]) => {
    api.listCalls[api.listCalls.length - 1].resolve(rows);
    await flush();
    fixture.detectChanges();
  };
  const renderedIds = () => allByTestId(fixture, 'cr-row').map((r) => text(r).match(/CR-\d+/)?.[0]);

  it('shows loading and no table while the request is in flight', () => {
    expect(byTestId(fixture, 'list-loading')).not.toBeNull();
    expect(byTestId(fixture, 'cr-table')).toBeNull();
    expect(component.visibleRows).toEqual([]);
  });

  it('asks for the current user', () => {
    expect(api.listCalls[0].user.id).toBe('mona');
  });

  it('renders loaded rows, defaulting to the pending approval filter', async () => {
    await loadWith(ROWS);
    expect(byTestId(fixture, 'list-loading')).toBeNull();
    expect(renderedIds()).toEqual(['CR-1', 'CR-3']);
    expect(text(byTestId(fixture, 'cr-row'))).toContain('+$12.34');
  });

  it('narrows both visibleRows and the rendered table when the filter changes', async () => {
    await loadWith(ROWS);

    click(fixture, 'filter-APPROVED');
    expect(component.visibleRows.map((r) => r.id)).toEqual(['CR-2']);
    expect(renderedIds()).toEqual(['CR-2']);

    click(fixture, 'filter-ALL');
    expect(component.visibleRows).toHaveLength(4);
    expect(renderedIds()).toEqual(['CR-1', 'CR-2', 'CR-3', 'CR-4']);
  });

  it('marks the active filter as pressed and shows counts', async () => {
    await loadWith(ROWS);
    click(fixture, 'filter-REJECTED');
    expect(byTestId(fixture, 'filter-REJECTED')?.getAttribute('aria-pressed')).toBe('true');
    expect(byTestId(fixture, 'filter-PENDING_APPROVAL')?.getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(text(byTestId(fixture, 'filter-PENDING_APPROVAL'))).toBe('Pending approval 2');
  });

  it('shows a filter-specific empty state that can be cleared', async () => {
    await loadWith([row('CR-1', 'APPROVED')]);
    expect(byTestId(fixture, 'cr-table')).toBeNull();
    expect(text(byTestId(fixture, 'list-filter-empty'))).toContain(
      'No pending approval change requests',
    );
    expect(byTestId(fixture, 'list-empty')).toBeNull();

    click(fixture, 'clear-filter');
    expect(renderedIds()).toEqual(['CR-1']);
  });

  it('shows the empty state when there are no change requests at all', async () => {
    await loadWith([]);
    expect(byTestId(fixture, 'list-empty')).not.toBeNull();
    expect(byTestId(fixture, 'list-filter-empty')).toBeNull();
    expect(byTestId(fixture, 'cr-table')).toBeNull();
  });

  it('shows an error with retry, and retry goes back through loading to loaded', async () => {
    api.listCalls[0].reject(new Error('Network error'));
    await flush();
    fixture.detectChanges();
    expect(text(byTestId(fixture, 'list-error'))).toContain('Change requests could not be loaded.');
    expect(byTestId(fixture, 'cr-table')).toBeNull();

    click(fixture, 'list-retry');
    expect(byTestId(fixture, 'list-error')).toBeNull();
    expect(byTestId(fixture, 'list-loading')).not.toBeNull();

    await loadWith(ROWS);
    expect(renderedIds()).toEqual(['CR-1', 'CR-3']);
  });

  it('ignores a stale response from a superseded request', async () => {
    const first = api.listCalls[0];
    component.load();
    await loadWith([row('CR-9', 'PENDING_APPROVAL')]);
    first.resolve(ROWS);
    await flush();
    fixture.detectChanges();
    expect(renderedIds()).toEqual(['CR-9']);
  });

  it('reloads for the new org when the user switches', async () => {
    await loadWith(ROWS);
    users.switchTo('bob');
    fixture.detectChanges();
    expect(api.listCalls).toHaveLength(2);
    expect(api.listCalls[1].user.orgCode).toBe('org-beta');
    expect(byTestId(fixture, 'list-loading')).not.toBeNull();
  });

  it('keeps the filter disabled until data has loaded', async () => {
    expect((byTestId(fixture, 'filter-ALL') as HTMLButtonElement).disabled).toBe(true);
    await loadWith(ROWS);
    expect((byTestId(fixture, 'filter-ALL') as HTMLButtonElement).disabled).toBe(false);
  });
});
