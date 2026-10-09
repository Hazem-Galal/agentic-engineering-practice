---
name: testing-standards
description: How to write tests for the Taskr API - file naming, Jest + supertest against in-memory SQLite, required coverage per endpoint, and how to word test descriptions. Use when adding, changing or reviewing tests.
---

# Writing tests for Taskr

## File naming

- Name each test file `<resource>.test.js` in lowercase, using the plural resource name: `tasks.test.js`, `projects.test.js`, `tags.test.js`. Put it in `tests/`.
- Jest only picks up `tests/*.test.js`. A file named any other way won't run.

## Setup: Jest + supertest + in-memory SQLite

The whole suite must run with `npm install` then `npm test`, and nothing else. A test must not depend on:
- `npm run db:seed` or `taskr.db`
- a running server
- environment variables set outside the test file
- network access

Each file sets `NODE_ENV=test` itself, which makes `src/db/connection.js` open `:memory:`. The app is imported without listening on a port.

```js
process.env.NODE_ENV = 'test'; // must come before requiring the app or DB

const request = require('supertest');
const app = require('../src/index');
const { db } = require('../src/db/connection');
const { createSchema } = require('./schema');

beforeAll(() => {
  createSchema(db);
});

beforeEach(() => {
  // Child tables first because of foreign keys
  db.exec('DELETE FROM task_tags; DELETE FROM comments; DELETE FROM tasks; DELETE FROM projects; DELETE FROM users; DELETE FROM tags;');
});
```

- Every test starts from a clean database. Seed the rows a test needs inside `beforeEach` or the test itself, never rely on another test's data.
- All test files share one in-memory DB per Jest worker, so always wipe in `beforeEach`.
- Build schema with `tests/schema.js`. Any schema change must also be made in `src/db/seed.js`.
- Send the `x-api-key` header (`dev-key` unless `API_KEY` is set) for endpoints behind `authenticate`.

## Coverage per endpoint

Group tests with one `describe` per endpoint (`describe('POST /tasks', ...)`). Each endpoint needs:

1. **The happy path**: assert the status code (`201` on create, `200` otherwise) and the response body.
2. **At least two error cases**, picked from what the endpoint can actually return, for example:
   - `400`: missing or invalid fields, an invalid status value
   - `404`: an unknown id, or a referenced project or assignee that doesn't exist
   - `409`: a duplicate email, tag or tag attachment
   - `401`: a missing or wrong API key on a protected endpoint

For error cases, assert both the status code and the error shape `{ error: <string> }` (see `docs/prd.md`). For writes, also check the database or a follow-up `GET` when the side effect matters (for example `completed_at` being set or cleared).

## Test descriptions

Write descriptions in plain English, describing what the endpoint does from a client's point of view, not implementation details (function names, SQL, internal fields).

| Good | Avoid |
|---|---|
| `returns 404 when the task does not exist` | `getTaskById returns undefined` |
| `clears the completion time when a task is reopened` | `sets completed_at to NULL in the UPDATE` |
| `rejects a second user with the same email` | `catches the UNIQUE constraint error` |

## Commands

```bash
npm test                                   # all tests
npx jest tests/tasks.test.js               # one file
npx jest -t "returns 404 when the task"    # one test by name
```

Before calling the work done, run `npm test` from a fresh checkout state and make sure it passes. Don't seed a database or start the server first. If the suite only passes after extra setup, fix the tests.
