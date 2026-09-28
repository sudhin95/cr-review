/**
 * Oldest first. Compares parsed instants (not strings) so mixed UTC offsets sort correctly.
 * Ties keep their original order; unparseable dates sink to the end rather than breaking the sort.
 */
export function sortTimeline(events: readonly any[]): any[] {
  return events
    .map((event, index) => ({ event, index, time: Date.parse(event.at) }))
    .sort((a, b) => {
      const aBad = Number.isNaN(a.time);
      const bBad = Number.isNaN(b.time);
      if (aBad || bBad) return aBad === bBad ? a.index - b.index : aBad ? 1 : -1;
      return a.time - b.time || a.index - b.index;
    })
    .map((entry) => entry.event);
}
