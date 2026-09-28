import { CrApiService } from './cr-api.service';
import { users } from './fixtures';

describe('CrApiService', () => {
  let api: CrApiService;

  beforeEach(() => (api = new CrApiService()));

  it("lists only the caller's org", async () => {
    const alpha = await api.listChangeRequests(users['approver']);
    const beta = await api.listChangeRequests(users['otherOrg']);
    expect(alpha.map((r) => r.id)).toEqual(['CR-1', 'CR-2', 'CR-3']);
    expect(beta.map((r) => r.id)).toEqual(['CR-9']);
  });

  it('hides other orgs on get', async () => {
    await expect(api.getChangeRequest(users['otherOrg'], 'CR-1')).rejects.toThrow('Not found');
  });

  it('records approve in status and audit', async () => {
    const at = '2026-03-04T00:00:00.000Z';
    const updated = await api.approve(users['approver'], 'CR-1', at);
    expect(updated.status).toBe('APPROVED');
    expect(updated.audit[updated.audit.length - 1]).toEqual({
      action: 'APPROVE',
      byUserId: 'mona',
      at,
      note: undefined,
    });
    expect((await api.listChangeRequests(users['approver']))[0].status).toBe('APPROVED');
  });

  it('fails the next call only when failNext is set', async () => {
    api.failNext = true;
    await expect(api.listChangeRequests(users['approver'])).rejects.toThrow('Network error');
    await expect(api.listChangeRequests(users['approver'])).resolves.toHaveLength(3);
  });
});
