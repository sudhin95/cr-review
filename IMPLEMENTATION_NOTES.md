# Implementation notes

## How the screens hold state

**List page (`CrListComponent`)**

The list keeps a single `ListState`: `loading`, `loaded` (with rows) or `error` (with a message).
Next to it is `statusFilter`, which starts on `PENDING_APPROVAL`. The rows you see come from the
`visibleRows` getter, so the table always matches the selected filter.

There are two different empty messages: one when there are no change requests at all, and one when
nothing matches the chosen status (that one has a "show all" button).

Every load gets a sequence number. If an older request finishes after a newer one, its result is
thrown away, so a slow response can't overwrite fresh data. Switching user reloads the list,
because `CrApiService` only returns requests for the user's org.

**Detail page (`CrDetailComponent`)**

The detail page has two separate pieces of state:

- `DetailState`: `loading`, `loaded` (with a view model) or `error`. The view model (diff rows,
  totals, sorted timeline) is built once when the data arrives, not recalculated in the template.
- `ActionState`: `idle`, `submitting`, `failed` or `succeeded`, for approve/reject.

I kept these apart on purpose. If an approve fails, the page doesn't turn into an error screen.
The request stays visible, the error shows inline, and the buttons still work.

`DiffTableComponent` and `TimelineComponent` only display what they're given. They don't fetch or
calculate anything themselves.

## Decisions about correctness

- **Diff:** line items are matched by SKU. A line only in the proposal is "added", a line only in
  the current version is "removed", and a line where quantity, price or description changed is
  "changed". The proposal's order is kept, and removed lines go at the end.
- **Money:** the fixture amounts (`unitPrice`, `delta`) are already in whole currency units and
  are shown as-is. A test checks that my calculated totals match each fixture's `baselineTotal`,
  `newTotal` and `delta`.
- **Timeline:** the fixtures store the audit trail newest first, so I sort by the actual time
  (`Date.parse`), not by the text or the stored order. Events with the same time keep their
  original order. Dates that can't be parsed go last.
- **Who can approve or reject** (`actionAvailability`): the request has to be `PENDING_APPROVAL`,
  in the user's org, the user needs the `cr_a_o` policy, and they can't be the person who created
  it (taken from the `CREATE` audit entry). The buttons only show when this passes, and
  `approve()` / `confirmReject()` check it again, so a read-only user can't act even by calling
  the method directly. The mock service doesn't check status or policy, so in this demo the
  client-side check is the only protection.
- **Double clicks:** while an action is running, the buttons are disabled and the handler returns
  straight away.
- **Reject:** needs a reason that isn't blank, up to 500 characters, trimmed before sending. If the
  reject fails, the form stays open and keeps the reason.

## Testing

- The pure functions (`diff`, `timeline`, `permissions`) and `CrApiService` have unit tests.
- Components are tested through the rendered page, using `data-testid` attributes.
- `FakeCrApi` returns a Promise that stays pending until the test resolves or rejects it. That lets
  me check the "in progress" state directly, without fake timers.
- The spec for `CrApiService` also covers `latencyMs` and `failNext`, which came with the provided
  mock.

## Assumptions

- People can't approve their own change requests.
- The list opens on "pending approval", because that's the reviewer's to-do list.

## Tradeoffs and next steps

- The filter lives in the component, not in the URL, so you can't share a link to a filtered
  list yet.
- No optimistic updates: the status only changes after the server confirms it.
- Next I'd add a keyboard shortcut for approve, pagination for long lists, and an end-to-end
  smoke test.

## AI usage

The UI was done using AI: the component templates, the page layout and the CSS styling.

I also used Claude Code (an AI coding assistant) for cleanup and pre-submission checks:

- Moving inline templates and styles out of `AppComponent`, `TimelineComponent` and
  `DiffTableComponent` into separate `.html` and `.css` files.
- Working out why images in `src/assets` weren't loading (the `assets` list in `angular.json` was
  empty, and one image path had the wrong capitalization).
- Checking that `npm ci && npm test` works from a clean copy, and running the build, type check and
  Prettier. That included removing leftover debug `console.log` calls, applying Prettier, and
  updating the test count in the README.
- Rewording these notes to make them easier to read.

I reviewed every change, and I re-ran the tests, the build and the format check to confirm
nothing broke.
