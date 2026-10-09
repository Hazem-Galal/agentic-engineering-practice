# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Taskr: a task-management REST API. Node.js (CommonJS), Express 5, SQLite via `better-sqlite3`, Jest + supertest. No build step and no linter configured. This repo is a starter codebase for agentic-engineering practice; the TODO comments in the source mark known debt.

The parent folder's `CLAUDE.md` (the "Last Train" landing page) does not apply to this repo.

`docs/prd.md` is the product spec: feature scope (Must/Should/Nice-to-have), API conventions (errors are `{ "error": "<message>" }`, deletes return `{ "deleted": true }`, status codes) and known gaps. Each known-gap fix changes behaviour, so write a failing test before fixing it.

## Commands

```bash
npm install
npm run db:seed        # create schema + sample data in taskr.db (skips if users exist)
npm start              # node src/index.js, port 3000 (PORT env overrides)
npm run dev            # same, with node --watch; GET /health
npm test               # all tests
npm run verify-app     # tests + boot server and check GET /health; run before committing
npx jest tests/tasks.test.js           # one file
npx jest -t "filters by ?status=active" # one test by name
```

`npm run db:reset` uses `rm -f taskr.db`, which fails under Windows cmd and also leaves the WAL files behind (`src/db/connection.js` enables `journal_mode = WAL`). On Windows/PowerShell: `Remove-Item taskr.db*; npm run db:seed`.

`.gitignore` covers `node_modules/`, `taskr.db*`, `.env*` and `.claude/.mcp.json` (holds credentials). Never commit them.

## Folder Structure

```
src/
  index.js            # builds the app, mounts routers, exports app
  routes/             # HTTP layer, one file per resource + root.js, webhooks.js
  services/           # business logic, one file per resource + email.js
  db/
    connection.js     # the single shared better-sqlite3 connection
    queries/          # SQL, one file per resource
    errors.js         # isUniqueViolation
    seed.js           # dev schema + sample data
  middleware/         # authenticate, request-logger, error-handler
  utils/              # constants, validation, http-error, pagination
tests/                # <resource>.test.js + schema.js
scripts/
  verify-app.js       # `npm run verify-app` pre-commit check
```

Each layer only calls the one below it:

- **Routes call services.** Never import `db/` from a route.
- **Services call queries.** Never call `db.prepare` from a service.
- **Queries call the database connection** (`src/db/connection.js`). They hold no validation or business rules.

Details:

- `src/index.js` builds the Express app, mounts every router and exports the app; it only listens when run directly (`require.main === module`), so tests import the app. `errorHandler` is mounted last.
- `src/routes/<resource>.js`: HTTP only. Each exports a named router (`usersRouter`, ...). Handlers parse params, call one service function, send the response, and pass errors to `next(err)`. No SQL, no validation. `comments.js` and `tags.js` (`taskTagsRouter`) are nested under `/tasks/:id/...` with `mergeParams`. `root.js` serves `GET /` and `GET /health`; `webhooks.js` serves `POST /webhooks/task-update`.
- `src/services/<resource>.js`: validation, existence checks, PUT field merging, task `completed_at` transitions, UNIQUE -> 409 mapping and side effects. Errors are thrown with `httpError(status, message)` (`src/utils/http-error.js`). Services may call any resource's queries. `email.js` is a console-logging stub called on user creation.
- `src/db/queries/<resource>.js`: one function per SQL statement, returning raw rows or `run()` results. `src/db/errors.js` detects UNIQUE violations by message text.
- `src/db/connection.js` exports the single shared `db`. `NODE_ENV=test` selects `:memory:`; otherwise `DB_PATH` or `taskr.db`. Foreign keys are on.
- `src/middleware/`: `authenticate.js` checks `x-api-key` against `API_KEY` (default `dev-key`), applied only to `DELETE /users/:id` and `DELETE /projects/:id`; `request-logger.js`; `error-handler.js` responds `err.status || 500` with `{ error }`.
- `src/utils/`: `constants.js` (`PORT`, `VALID_TASK_STATUSES`, page sizes), `validation.js`, `http-error.js`, and `pagination.js` (`buildPaginationMeta`, unused until the Should-have pagination-metadata feature).
- Valid task statuses are in `VALID_TASK_STATUSES` and the schema's CHECK constraint.

## Naming Conventions

- All files use kebab-case (`error-handler.js`, `http-error.js`). No camelCase or PascalCase file names.
- Resource files use the plural resource name and the same name in every layer: `routes/tasks.js`, `services/tasks.js`, `db/queries/tasks.js`, `tests/tasks.test.js`.
- Routers are named exports called `<resource>Router` (`tasksRouter`). Query functions start with `find`, `list`, `insert`, `update`, `delete` or `count`.

## Schema and tests

- The schema is defined twice: in `src/db/seed.js` (dev DB) and in `tests/schema.js` (tests). Any schema change must be made in both.
- Tests live in `tests/<resource>.test.js`. Each file sets `process.env.NODE_ENV = 'test'` before requiring `../src/index`, creates the schema in `beforeAll`, and wipes all tables in `beforeEach` (child tables first because of FKs). All test files share one in-memory DB per Jest worker.
- Jest's `testMatch` is `**/tests/*.test.js`; a file named any other way won't run.

Contribution workflow (commit convention, `verify-app`, no commits with failing tests) is in `CONTRIBUTING.md`.

## Context Files

Read the matching file before starting:

- `.claude/skills/api-conventions/SKILL.md`: for any task involving API routes or endpoints.
- `.claude/skills/testing-standards/SKILL.md`: for any task involving tests or test coverage.
