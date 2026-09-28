export type ActionAvailability = { canAct: true } | { canAct: false; reason: string };

export const READ_POLICY = 'cr_r_o';
export const APPROVE_POLICY = 'cr_a_o';

/** The user who created the change request, taken from its CREATE audit entry. */
export function requesterOf(cr: any): string | null {
  return cr.audit?.find((entry: any) => entry.action === 'CREATE')?.byUserId ?? null;
}

/**
 * Status, org and policy must all allow an action. The detail page renders Approve/Reject only
 * when this returns canAct: true, and the component re-checks it before calling the API.
 */
export function actionAvailability(cr: any, user: any): ActionAvailability {
  if (cr.status !== 'PENDING_APPROVAL') {
    return {
      canAct: false,
      reason: `This change request is ${statusLabel(cr.status).toLowerCase()}, not awaiting approval.`,
    };
  }
  if (cr.orgCode !== user.orgCode) {
    return { canAct: false, reason: 'This change request belongs to another organisation.' };
  }
  if (!user.policies?.includes(APPROVE_POLICY)) {
    return { canAct: false, reason: 'You have read-only access to change requests.' };
  }
  if (requesterOf(cr) === user.id) {
    return { canAct: false, reason: 'You cannot decide on a change request you created.' };
  }
  return { canAct: true };
}

/** PENDING_APPROVAL -> "Pending approval". */
export function statusLabel(status: string): string {
  const words = status.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
