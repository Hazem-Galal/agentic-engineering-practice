# Taskr — Product Requirements

## Vision

Taskr is a small, self-hosted REST API for task management. A team or a single developer can track work as tasks, group tasks into projects, assign them to people, discuss them in comments and label them with tags. Running it takes nothing but Node.js; storage is a single SQLite file.

This repo is also a practice codebase for agentic engineering. The product scope stays deliberately small so that changes can focus on code quality, testing and safe refactoring.

## Users

| User | Needs |
|---|---|
| API client developer | Predictable JSON endpoints for building a UI, CLI or integration on top of Taskr |
| Team member (via a client) | Create, assign, update and complete tasks; comment on them |
| Operator | Run locally with no external services; seed sample data; delete data safely |

## Core concepts

- **User**: a name and a unique email.
- **Project**: a named group of tasks, with an optional description and owner.
- **Task**: the unit of work. It has a title, an optional description, project, assignee and due date, and a status: `active`, `completed` or `archived`.
- **Comment**: text a user writes on a task.
- **Tag**: a unique, lowercase label. A task can have many tags and a tag can be on many tasks.

## Features (current scope)

### Must-have

1. **Users**: list, create, get, update and delete. Creating a user validates the email format, rejects a duplicate email with 409 and sends a welcome email (currently a logging stub).
2. **Projects**: list, create, get, update and delete. `GET /projects/:id` includes task counts by status.
3. **Tasks**: list, create, get, update and delete.
   - Listing filters by `status`, `project_id` and `assignee_id`. It is paginated with `page` and `page_size` (default 20, max 100) and returns newest first.
   - Creating a task checks that the project and assignee it references exist.
   - `completed_at` is set when a task moves to `completed` and cleared when it moves out.
   - `GET /tasks/:id` includes the task's tags and comments.
4. **Comments**: list a task's comments in chronological order and add new ones. Each comment includes the author's name.
5. **Tags**: list and create tags. Attach a tag to a task, or remove it. A duplicate tag or a duplicate attachment returns 409.
6. **Health**: `GET /health` returns status and a timestamp.

### Should-have (not built)

- Filter tasks by tag and by due date.
- Pagination metadata (total, total pages) in list responses.
- Return 404 rather than 500 for a malformed id.

### Nice-to-have (not built)

- Process task-update webhooks (`POST /webhooks/task-update` currently only logs the payload).
- A real email provider for notifications.

## API conventions

- JSON in, JSON out. Errors use the shape `{ "error": "<message>" }`.
- Status codes: `201` on create; `400` for validation errors; `401` without a valid API key; `404` when a resource is missing; `409` on uniqueness conflicts; `500` for anything unexpected.
- Delete endpoints return `{ "deleted": true }`.

## Non-functional requirements

- **Setup**: `npm install` then `npm run db:seed`; no external database or service.
- **Storage**: SQLite with foreign keys enforced. Tests run against an in-memory database.
- **Security**: `DELETE /users/:id` and `DELETE /projects/:id` require an `x-api-key` header that matches `API_KEY`. Secrets come from the environment, never from code.
- **Quality**: every endpoint's behaviour is covered by Jest + supertest tests, and `npm test` must pass before a merge.

## Known gaps

Tracked as tech debt. Each one changes behaviour, so it needs a test before it is fixed.

- Most write endpoints have no authentication. A real auth model (for example JWT, with users acting as themselves) is not defined yet.
- There are no cascade rules. Deleting a task that has comments or tags, or a user or project that has dependent rows, is rejected by the foreign-key constraint.
- `PUT` endpoints do not re-validate fields (for example the email format on a user update, or referenced ids on a task update).
- The schema is defined in two places: `src/db/seed.js` and `tests/schema.js` (see `CLAUDE.md`).

## Success criteria

- A new developer runs the API and the full test suite in under 5 minutes on Windows, macOS or Linux.
- Every endpoint listed above behaves as specified and is covered by a test.
- Every error response uses the documented shape and status code.
- Refactors (splitting routes, adding a repository layer) land with no change in API behaviour, and the existing tests prove it.

## Out of scope

- A web UI, real-time updates, file attachments, multi-tenancy and roles or permissions beyond the API key.
