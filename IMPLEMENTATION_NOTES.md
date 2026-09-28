# Implementation notes

## Screens and component state

**List (`CrListComponent`)** holds one discriminated union, `ListState`:
`loading | loaded(rows) | error(message)`, plus `statusFilter` (default `PENDING_APPROVAL`).
`visibleRows` is a getter derived from both, so the table can never disagree with the filter.
Two empty states are distinct: "no change requests yet" versus "nothing matches this status"
(with a button to show all). Each load bumps a sequence number and older Promises are ignored,
so a slow, stale response cannot overwrite a newer one. Switching user reloads, because
`CrApiService` is org-scoped.

**Detail (`CrDetailComponent`)** holds two independent unions:

- `DetailState`: `loading | loaded(vm) | error(message)`. The view model (diff rows, totals,
  sorted timeline) is computed once when a request arrives, not in the template.
- `ActionState`: `idle | submitting(action) | failed(action, message) | succeeded(action)`.

Keeping them separate means a failed approve never replaces the page with an error; the last
known request stays on screen with an inline error and working buttons.

`DiffTableComponent` and `TimelineComponent` are presentational and receive computed data only.

## Correctness decisions

- **Diff classification** matches lines by SKU. Only in proposed means added, only in current
  means removed, any field change (quantity, price, description) means changed. Proposed order is
  kept and removed lines are appended.
- **Money** amounts come from the fixtures in major units (`unitPrice`, `delta`) and are formatted
  as such. The computed diff totals match each fixture's `baselineTotal` / `newTotal` / `delta`
  (covered by a test).
- **Timeline** sorts the `audit` trail by parsed instant (`Date.parse`), not by string or stored
  order (fixtures store it newest first). Ties keep original order; unparseable dates go last.
- **Action availability** (`actionAvailability`) requires `PENDING_APPROVAL` status, the same
  org, the `cr_a_o` policy, and not being the creator (the `CREATE` audit entry). The template
  renders buttons only when it passes, and `approve()` / `confirmReject()` re-check it, so a
  read-only user cannot act even by calling the method. The mock service itself does not check
  status or policy, so this client-side gate is the only guard in the demo.
- **Duplicate actions**: buttons are disabled and the handler returns early while any action is in
  flight.
- **Reject** requires a non-blank reason (max 500), trimmed before sending. On failure the form
  stays open with the reason preserved.

## Testing strategy

- Pure functions (`diff`, `timeline`, `permissions`) and `CrApiService` have unit tests.
- Components are tested through the rendered DOM with `data-testid` hooks.
- `FakeCrApi` returns a pending Promise per call, so each test decides when a response arrives or
  fails. That makes the in-flight (slow) state directly assertable without timers.
- `CrApiService.latencyMs` / `failNext` (part of the provided mock) are exercised in its spec.

## Assumptions

- Creators cannot approve their own change requests.
- The list defaults to pending approval because that is the reviewer's work queue.

## Tradeoffs and what I would do next

- Filter is component state, not a URL query param; sharing a filtered link would need it.
- No optimistic updates: the status changes only after the server confirms.
- Next: keyboard shortcut for approve, pagination for long lists, e2e smoke test.

## AI usage

_Fill in honestly: which parts you generated, what you changed, and how you verified it._
