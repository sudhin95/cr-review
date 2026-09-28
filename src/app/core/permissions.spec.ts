import { details, users } from './fixtures';
import { actionAvailability, statusLabel } from './permissions';

const pending = details['CR-1']; // org-alpha, created by alice

describe('actionAvailability', () => {
  it('allows an approver in the same org on a pending request', () => {
    expect(actionAvailability(pending, users['approver']).canAct).toBe(true);
  });

  it.each(['DRAFT', 'APPROVED', 'REJECTED', 'APPLIED'])('blocks actions on %s requests', (status) => {
    expect(actionAvailability({ ...pending, status }, users['approver']).canAct).toBe(false);
  });

  it('blocks read-only users even on pending requests', () => {
    expect(actionAvailability(pending, users['viewer'])).toEqual({
      canAct: false,
      reason: 'You have read-only access to change requests.',
    });
  });

  it('blocks approvers from another org', () => {
    expect(actionAvailability(pending, users['otherOrg']).canAct).toBe(false);
  });

  it('blocks the creator from deciding their own request', () => {
    expect(actionAvailability(details['CR-9'], users['otherOrg']).canAct).toBe(false);
  });
});

describe('statusLabel', () => {
  it('turns enum values into readable labels', () => {
    expect(statusLabel('PENDING_APPROVAL')).toBe('Pending approval');
    expect(statusLabel('APPLIED')).toBe('Applied');
  });
});
