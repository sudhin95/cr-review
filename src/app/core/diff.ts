export type ChangeKind = 'added' | 'removed' | 'modified' | 'unchanged';

export interface DiffRow {
  sku: string;
  description: string;
  kind: ChangeKind;
  before: any | null;
  after: any | null;
  beforeTotal: number;
  afterTotal: number;
  delta: number;
  /** Which fields changed, for highlighting modified rows. */
  changedFields: Array<'description' | 'quantity' | 'unitPrice'>;
}

export interface DiffTotals {
  before: number;
  after: number;
  delta: number;
  /** Percentage change relative to the original total; null when original total is 0. */
  deltaPercent: number | null;
}

export function lineTotal(item: any | null): number {
  return item ? item.quantity * item.unitPrice : 0;
}

/**
 * Classifies each line by SKU.
 * - only in `after`  -> added
 * - only in `before` -> removed
 * - in both, any field differs -> modified
 * - in both, identical -> unchanged
 * Output keeps the proposed (`after`) order, then appends removed lines in their original order.
 */
export function buildDiff(before: any[], after: any[]): DiffRow[] {
  const beforeBySku = new Map(before.map((item) => [item.sku, item]));
  const afterSkus = new Set(after.map((item) => item.sku));

  const rows: DiffRow[] = after.map((next) => {
    const prev = beforeBySku.get(next.sku) ?? null;
    const changedFields = prev ? diffFields(prev, next) : [];
    const kind: ChangeKind = !prev ? 'added' : changedFields.length ? 'modified' : 'unchanged';
    return toRow(next.sku, next.description, kind, prev, next, changedFields);
  });

  for (const prev of before) {
    if (!afterSkus.has(prev.sku)) {
      rows.push(toRow(prev.sku, prev.description, 'removed', prev, null, []));
    }
  }
  return rows;
}

export function diffTotals(rows: DiffRow[]): DiffTotals {
  const before = rows.reduce((sum, r) => sum + r.beforeTotal, 0);
  const after = rows.reduce((sum, r) => sum + r.afterTotal, 0);
  const delta = after - before;
  const deltaPercent = before === 0 ? null : (delta / before) * 100;
  return { before, after, delta, deltaPercent };
}

function diffFields(prev: any, next: any): DiffRow['changedFields'] {
  const fields: DiffRow['changedFields'] = [];
  if (prev.description !== next.description) fields.push('description');
  if (prev.quantity !== next.quantity) fields.push('quantity');
  if (prev.unitPrice !== next.unitPrice) fields.push('unitPrice');
  return fields;
}

function toRow(
  sku: string,
  description: string,
  kind: ChangeKind,
  before: any | null,
  after: any | null,
  changedFields: DiffRow['changedFields'],
): DiffRow {
  const beforeTotal = lineTotal(before);
  const afterTotal = lineTotal(after);
  return {
    sku,
    description,
    kind,
    before,
    after,
    beforeTotal,
    afterTotal,
    delta: afterTotal - beforeTotal,
    changedFields,
  };
}
