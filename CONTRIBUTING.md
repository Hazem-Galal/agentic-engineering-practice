# Contributing to Taskr

Taskr is a task-management REST API built with Node.js (CommonJS), Express 5, SQLite (`better-sqlite3`) and Jest + supertest. There is no build step and no linter. This guide covers getting set up, how we write commits, and the checks every change must pass.

For the layering rules, naming conventions and folder layout, see [`CLAUDE.md`](CLAUDE.md). For feature scope and API conventions, see [`docs/prd.md`](docs/prd.md).

---

## 1. Setting up the development environment

### Prerequisites

- **Node.js 18 or newer** (`npm run dev` uses `node --watch`, and `verify-app` uses the built-in `fetch`). Node 22 is what we test on.
- **npm** (ships with Node).
- **git**.
- A C/C++ toolchain is only needed if npm can't download a prebuilt `better-sqlite3` binary for your platform.

No external database or services are required. SQLite runs in-process.

### From a fresh clone

```bash
git clone <repo-url> agentic-engineering-practice
cd agentic-engineering-practice
npm install          # install dependencies
npm test             # confirm the suite passes before you change anything
npm run db:seed      # create taskr.db with schema + sample data (skips if users exist)
npm run dev          # start on port 3000 with file watching
```

Check the server is running by opening `http://localhost:3000/health`. It should return `{ "status": "ok", ... }`.

### Configuration

All settings come from environment variables. Defaults work for local development.

| Variable  | Default    | Purpose |
|-----------|------------|---------|
| `PORT`    | `3000`     | HTTP port |
| `DB_PATH` | `taskr.db` | SQLite file path (ignored when `NODE_ENV=test`, which uses `:memory:`) |
| `API_KEY` | `dev-key`  | Value expected in the `x-api-key` header for `DELETE /users/:id` and `DELETE /projects/:id` |

If you keep these in a `.env` file, don't commit it. `.gitignore` already covers `.env*`.

### Resetting the local database

```bash
npm run db:reset                         # macOS / Linux / Git Bash
Remove-Item taskr.db*; npm run db:seed   # Windows PowerShell
```

`db:reset` uses `rm -f taskr.db`, which fails under Windows `cmd` and leaves the `taskr.db-wal` / `taskr.db-shm` files behind, because the connection enables WAL mode. If the data looks stale after a reset, delete `taskr.db*` by hand.

### Never commit these

`node_modules/`, `taskr.db*`, `.env*` and `.claude/.mcp.json` (holds credentials) are all in `.gitignore`. Check `git status` before committing and don't force-add them.

---

## 2. Commit message convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short summary>

<optional body: what changed and why>
```

**Types used in this repo:**

| Type       | Use for |
|------------|---------|
| `feat`     | A new endpoint or user-visible behaviour |
| `fix`      | A bug fix, including fixes for the known gaps listed in `docs/prd.md` |
| `refactor` | Code restructuring with no behaviour change |
| `test`     | Adding or changing tests only |
| `docs`     | Documentation only (`README.md`, `CLAUDE.md`, `docs/`, skills) |
| `chore`    | Tooling, dependencies, `.gitignore`, config |

**Rules:**

- Write the summary in the imperative mood and lower case, with no trailing period: `add`, not `added` or `Adds`.
- Keep the summary under about 72 characters.
- Use a scope when it helps, usually the resource or file area: `docs(prd): ...`, `feat(tasks): ...`, `fix(comments): ...`.
- Make one logical change per commit. A refactor that touches several resources is better as one commit per resource; see the `refactor: extract <resource> into routes, services and queries` series in the history.

**Examples from the history:**

```
refactor: extract tasks into routes, services and queries
test: rename legacy test files to <resource>.test.js
docs(claude): add Folder Structure and Naming Conventions sections
chore: add .gitignore for node_modules, local DB, and MCP config
```

---

## 3. Running the test suite

```bash
npm test                                   # all tests
npm run test:watch                         # re-run on file changes
npx jest tests/tasks.test.js               # one file
npx jest -t "filters by ?status=active"    # one test by name
```

The suite runs against an in-memory SQLite database. It needs `npm install` and nothing else: no `db:seed`, no running server, no extra environment variables, no network. If a test only passes after extra setup, the test is wrong. Fix it.

### What a passing run looks like

The request logger and the email stub write `console.log` output while the tests run. That output is expected and doesn't mean anything failed. What matters is the summary at the end:

```
PASS tests/tags.test.js
PASS tests/comments.test.js
PASS tests/tasks.test.js
PASS tests/projects.test.js
PASS tests/users.test.js

Test Suites: 5 passed, 5 total
Tests:       60 passed, 60 total
Snapshots:   0 total
Time:        2.039 s
Ran all test suites.
```

A run passes when:

- every suite line says `PASS` (none say `FAIL`),
- the `Test Suites` and `Tests` lines show **only** `passed` counts, with no `failed`, `skipped` or `todo`,
- the command exits with code `0`.

The test count goes up as features are added. Run `npx jest --silent` to hide the console output.

### Writing tests

Tests live in `tests/<resource>.test.js`. Jest only runs files matching `tests/*.test.js`. Each endpoint needs a happy-path test plus at least two error cases. The full standards (setup boilerplate, coverage, how to word test descriptions) are in [`.claude/skills/testing-standards/SKILL.md`](.claude/skills/testing-standards/SKILL.md).

The schema is defined twice, in `src/db/seed.js` and in `tests/schema.js`. Any schema change must be made in both.

---

## 4. `npm run verify-app`

```bash
npm run verify-app
```

`verify-app` is the end-to-end check to run before you commit. It does two things:

1. Runs the full Jest suite (with `--silent`). It fails if any test fails, **or if any test was skipped or left as a todo**. A stray `.only`, `.skip` or `.todo` fails the check even though plain `npm test` would exit `0`.
2. Boots the real server (`src/index.js`) on a free port with an in-memory database and checks that `GET /health` returns `200` with `{ "status": "ok" }`. If the server exits during startup, it fails straight away and prints the server's error output. If the server never answers, it gives up after 10 seconds.

It exits `0` and prints the following only when both steps succeed:

```
verify-app: OK - tests passed and server is healthy
```

Otherwise it prints `verify-app: FAILED - ...` and exits `1`. It never reads or writes `taskr.db`.

**Run it:**

- before every commit,
- before pushing a branch or opening a pull request,
- after pulling or merging someone else's changes,
- after changing `src/index.js`, router mounting, middleware, `src/db/connection.js`, `src/utils/constants.js` or dependencies. These can break startup even when every supertest test passes, because the tests import the app without calling `listen`.

While you're iterating on a single feature, `npx jest <file>` is faster. Use `verify-app` as the final check.

---

## 5. Never commit code with failing tests

**Every commit must pass the full test suite.** Before you run `git commit`, run `npm run verify-app` (or at least `npm test`) and confirm it passes as described above. This applies to every commit, not just the last one on a branch, so that any commit can be checked out, bisected or reverted safely.

What this means in practice:

- **Don't commit with any `FAIL` lines**, even if the failure "isn't yours". Fix it, or raise it before building on top of it.
- **Don't skip, disable or delete a test to get to green** (`it.skip`, `xit`, `describe.skip`, `.only`, commenting out assertions). If a test is wrong, fix the test in its own commit and explain why in the message.
- **Don't use `git commit --no-verify`** to bypass checks.
- **Test-first changes still go in green.** Fixes for the known gaps in `docs/prd.md` change behaviour, so write the failing test first, but commit the test **together with** the fix that makes it pass. Never commit the red test on its own.
- **Run the full suite, not just the file you changed.** All test files share one in-memory database per Jest worker, so a change in one area can break another.

If you find the suite already failing on the branch you started from, stop and report it rather than committing on top of it.

---

## Before you open a pull request

- [ ] `npm run verify-app` passes.
- [ ] New or changed endpoints have tests: a happy path plus at least two error cases.
- [ ] Code follows the layering in `CLAUDE.md` (routes → services → queries → connection) and the kebab-case file naming.
- [ ] Schema changes are in both `src/db/seed.js` and `tests/schema.js`.
- [ ] Commit messages follow Conventional Commits.
- [ ] No `node_modules/`, `taskr.db*`, `.env*` or `.claude/.mcp.json` in the diff.
