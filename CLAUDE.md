# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Taskr: a task-management REST API. Node.js (CommonJS), Express 5, SQLite via `better-sqlite3`, Jest + supertest. No build step and no linter configured. This repo is a deliberately messy starter codebase for agentic-engineering practice; the TODO comments in the source mark known debt.

The parent folder's `CLAUDE.md` (the "Last Train" landing page) does not apply to this repo.

## Commands

```bash
npm install
npm run db:seed        # create schema + sample data in taskr.db (skips if users exist)
npm run dev            # node --watch, port 3000 (PORT env overrides); GET /health
npm test               # all tests
npx jest tests/tasks.test.js           # one file
npx jest -t "filters by ?status=active" # one test by name
```

`npm run db:reset` uses `rm -f`, which fails under Windows cmd. On Windows, delete `taskr.db` manually, then run `db:seed`.

## Architecture

- `index.js` builds the Express app and exports it; it only listens when run directly (`require.main === module`), so tests import the app. `GET /` and `POST /webhooks/task-update` live here, not in `routes.js`.
- `routes.js` holds every resource route (users, projects, tasks, comments, tags) in one router. Most handlers run SQL inline against `db` with inline validation. Users are the exception: they delegate to `UserController.js`. Task reads go through `get-tasks.js` (`getTasks` filtering/pagination, `getTaskById` which attaches `tags` and `comments`).
- `DB.js` exports a single shared `db` connection. `NODE_ENV=test` selects `:memory:`; otherwise `DB_PATH` or `taskr.db`. Foreign keys are on.
- `auth.js`: `authenticate` checks the `x-api-key` header against `API_KEY` (default `dev-key`). It is applied only to `DELETE /users/:id` and `DELETE /projects/:id`.
- Errors: handlers mostly respond directly. `UserController` throws `Error`s with a `.status` that the route maps to the response. UNIQUE constraint violations are detected by message text and mapped to 409.
- Task `completed_at` is set or cleared in `PUT /tasks/:id` when status transitions to or from `completed`. Valid statuses are in `misc/constants.js` (`VALID_TASK_STATUSES`) and the schema's CHECK constraint.
- Circular dependency: `routes.js` lazily requires `projectHelpers.js`, and `projectHelpers.formatProjectSummary` lazily requires `routes.js` for `getTasksForProject`. Keep those requires inside function bodies.
- `sendEmail.js` is a console-logging stub called on user creation.
- `misc/oldRoutes.js` and `misc/temp.js` are dead code and not imported anywhere.

## Schema and tests

- The schema is defined twice: in `db/seed.js` (dev DB) and in `tests/schema.js` (tests). Any schema change must be made in both.
- Each test file sets `process.env.NODE_ENV = 'test'` before requiring the app, creates the schema in `beforeAll`, and wipes all tables in `beforeEach` (child tables first because of FKs). All test files share one in-memory DB per Jest worker.
- Jest's `testMatch` in `package.json` lists the test files explicitly (`tests/*.test.js`, `tests/userTest.js`, `tests/test-projects.js`). A new test file is only picked up if it is named `*.test.js` or added to that list.
