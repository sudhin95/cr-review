import { buildDiff, diffTotals } from './diff';
import { details } from './fixtures';

const item = (sku: string, quantity: number, unitPrice: number, description = sku): any => ({
  sku,
  description,
  quantity,
  unitPrice,
});

describe('buildDiff', () => {
  it('classifies added, removed, modified and unchanged lines by SKU', () => {
    const rows = buildDiff(
      [item('A', 1, 100), item('B', 2, 100), item('C', 1, 500)],
      [item('A', 1, 100), item('B', 3, 100), item('D', 4, 50)],
    );
    expect(rows.map((r) => [r.sku, r.kind])).toEqual([
      ['A', 'unchanged'],
      ['B', 'modified'],
      ['D', 'added'],
      ['C', 'removed'],
    ]);
  });

  it('treats a price-only or description-only change as modified', () => {
    const [price] = buildDiff([item('A', 1, 100)], [item('A', 1, 90)]);
    const [desc] = buildDiff([item('A', 1, 100, 'Old')], [item('A', 1, 100, 'New')]);
    expect(price.kind).toBe('modified');
    expect(price.changedFields).toEqual(['unitPrice']);
    expect(desc.kind).toBe('modified');
  });

  it('computes per-line deltas', () => {
    const rows = buildDiff([item('A', 2, 1050), item('R', 1, 999)], [item('A', 3, 1050)]);
    expect(rows.find((r) => r.sku === 'A')?.delta).toBe(1050);
    expect(rows.find((r) => r.sku === 'R')?.delta).toBe(-999);
  });
});

describe('diffTotals', () => {
  it('sums before/after and returns delta and percentage', () => {
    const totals = diffTotals(buildDiff([item('A', 10, 100)], [item('A', 15, 100)]));
    expect(totals).toEqual({ before: 1000, after: 1500, delta: 500, deltaPercent: 50 });
  });

  it('returns null percentage when the original total is zero', () => {
    expect(diffTotals(buildDiff([], [item('A', 1, 100)])).deltaPercent).toBeNull();
  });

  it.each(Object.keys(details))('matches the fixture totals for %s', (id) => {
    const cr = details[id];
    const totals = diffTotals(buildDiff(cr.baselineLineItems, cr.proposedLineItems));
    expect(totals.before).toBe(cr.baselineTotal);
    expect(totals.after).toBe(cr.newTotal);
    expect(totals.delta).toBe(cr.delta);
  });
});
