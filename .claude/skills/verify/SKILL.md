---
name: verify
description: How to run and drive the Taskr API to verify a change at its real surface (HTTP or the verify-app CLI). Use when verifying a change works in the running app.
---

# Verifying Taskr changes

No build step. `npm install` is the only setup.

## Launch the server (isolated)

```bash
NODE_ENV=test PORT=3123 node src/index.js &   # in-memory DB, empty: no tables
DB_PATH=$(mktemp -d)/t.db npm run db:seed && DB_PATH=<same> PORT=3123 node src/index.js &   # seeded file DB
curl -s localhost:3123/health
```

- `NODE_ENV=test` ignores `DB_PATH` and opens `:memory:` with **no schema**, so only `/` and `/health` work. To hit resource routes, use a temp `DB_PATH` seeded with `npm run db:seed` (never the repo's `taskr.db`).
- Protected deletes (`DELETE /users/:id`, `DELETE /projects/:id`) need `-H 'x-api-key: dev-key'`.
- Stop the server with `kill %1`. When you check for leftover servers, `pgrep -f 'node src/index.js'` also matches your own shell's command line. Use `ps -eo args | grep -E '^node .*src/index\.js'` instead.

## verify-app CLI (`scripts/verify-app.js`)

- `npm run verify-app` → `verify-app: OK - ...`, exit 0.
- To check that it fails when it should, break something temporarily and run `git checkout` on that file afterwards:
  - Server never listens: replace `require.main === module` in `src/index.js` with `false`. Expect `FAILED - server exited during startup (0)`.
  - Server crashes: add `throw new Error("boom")` before `app.listen`. Expect FAILED within about 3s, with the stack trace printed.
  - Failing test: change an expected status in `tests/users.test.js`. Expect `FAILED - test suite did not pass`.
  - Skipped test: change the first `test(` in `tests/tags.test.js` to `test.only(`. Expect `FAILED - 14 skipped ...`.
