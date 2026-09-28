import { sortTimeline } from './timeline';

const ev = (id: string, at: string): any => ({ id, at, byUserId: 'x', action: 'SUBMIT' });

describe('sortTimeline', () => {
  it('orders oldest first by instant, not by string, across UTC offsets', () => {
    // a = 06:15Z, b = 06:40Z, c = 08:05Z the next day. String order would put b first.
    const sorted = sortTimeline([
      ev('c', '2026-09-22T08:05:00Z'),
      ev('b', '2026-09-21T10:40:00+04:00'),
      ev('a', '2026-09-21T09:15:00+03:00'),
    ]);
    expect(sorted.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps original order for identical timestamps and does not mutate input', () => {
    const input = [ev('first', '2026-01-01T00:00:00Z'), ev('second', '2026-01-01T00:00:00Z')];
    expect(sortTimeline(input).map((e) => e.id)).toEqual(['first', 'second']);
    expect(input[0].id).toBe('first');
  });

  it('puts unparseable dates last', () => {
    const sorted = sortTimeline([ev('bad', 'not a date'), ev('ok', '2026-01-01T00:00:00Z')]);
    expect(sorted.map((e) => e.id)).toEqual(['ok', 'bad']);
  });

  it('orders the fixture audit trail that is stored newest first', () => {
    const sorted = sortTimeline([
      { action: 'SEND_FOR_APPROVAL', at: '2026-03-02T10:00:00.000Z' },
      { action: 'SUBMIT', at: '2026-03-02T09:30:00.000Z' },
      { action: 'CREATE', at: '2026-03-02T09:00:00.000Z' },
    ]);
    expect(sorted.map((e) => e.action)).toEqual(['CREATE', 'SUBMIT', 'SEND_FOR_APPROVAL']);
  });
});
