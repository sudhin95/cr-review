# Change Request Review UI

Angular 16 (CLI 16.2.16, framework 16.2.12) reviewer flow for procurement change requests:
find a request, understand the proposed changes and history, then approve or reject it.

## Run

```bash
npm ci
npm start          # http://localhost:4200
npm test           # Jest, 46 tests
npm run build      # production build
npm run format:check
```

Node 18 or 20 recommended.

## Trying every state

- **User picker** (top right): Amal is a full approver, Omar has a $5,000 limit and is the
  requester of most items, Rana is read-only.
- **Simulate network** (bottom right): switch to slow responses (2.5 s) and make the list, the
  detail, or approve/reject fail. Settings apply to the next request.

## Layout

```
src/app/core        models, fixtures, mock API, pure logic (diff, timeline, permissions)
src/app/shared      money pipe, status badge
src/app/features    list/ and detail/ screens (detail = page + diff table + timeline)
src/testing         fake API with manually resolved responses, DOM helpers
```
