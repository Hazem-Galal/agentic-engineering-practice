---
name: api-conventions
description: How to add a new API endpoint to the Taskr API (src/routes -> src/services -> src/db/queries, registered in src/index.js). Use when adding or changing a route, resource or endpoint.
---

# Adding an API endpoint to Taskr

Routes call services, services call queries. File names are kebab-case.

## Where things go

| Concern | Location |
|---|---|
| Route definitions (HTTP only) | `src/routes/<resource>.js` |
| Business logic (validation, side effects) | `src/services/<resource>.js` |
| SQL (one function per statement) | `src/db/queries/<resource>.js` |
| Router registration | `src/index.js` |

## Rules

1. **One route file per resource.** New routes go in a dedicated file in `src/routes/`. The file name is the resource name in lowercase plural: `tasks.js`, `projects.js`, `tags.js`.
2. **Export a named Express router.** Each route file exports its router by name, never as a default export:

   ```js
   const express = require('express');
   const tasksService = require('../services/tasks');

   const tasksRouter = express.Router();

   tasksRouter.get('/:id', (req, res, next) => {
     try {
       res.json(tasksService.getTaskById(parseInt(req.params.id)));
     } catch (err) {
       next(err); // the service throws httpError(404, 'Task not found')
     }
   });

   module.exports = { tasksRouter };
   ```

3. **No business logic in handlers.** A handler parses the request, calls the matching function in `src/services/`, and sends the response. Validation and side effects (for example `completed_at` handling or welcome emails) belong in the service. SQL belongs in `src/db/queries/`; services never call `db` directly.
4. **Errors go to `next`.** Services throw `httpError(status, message)` from `src/utils/http-error.js` (an `Error` with `.status`), for example `throw httpError(400, 'title is required')`. The handler catches it and forwards it with `next(err)`. Don't call `res.status(...).json({ error })` from a handler. The central `errorHandler` turns `{ status, message }` into a `{ "error": "<message>" }` response.
5. **Register in `src/index.js`.** Mount every router with `app.use` using the resource path and the imported router:

   ```js
   const { tasksRouter } = require('./routes/tasks');
   app.use('/tasks', tasksRouter);
   ```

   Paths inside the router are relative to that mount (`'/'`, `'/:id'`). Nested resources such as `/tasks/:id/comments` need `express.Router({ mergeParams: true })` to read the parent `:id`.

## Responses

Follow the API conventions in `docs/prd.md`:
- `201` on create
- `400` for validation errors
- `401` without a valid API key
- `404` for a missing resource
- `409` for uniqueness conflicts
- `500` for anything unexpected

Delete endpoints return `{ "deleted": true }`.

## Checklist before done

- [ ] Route file is `src/routes/<plural>.js` and exports a named router
- [ ] Handlers only call `src/services/` functions; services only call `src/db/queries/` for SQL
- [ ] Errors are thrown with `httpError(status, message)` and passed on with `next(err)`
- [ ] Router is mounted in `src/index.js` with `app.use('/<plural>', router)`
- [ ] A Jest + supertest test covers the endpoint, including error cases. A new test file must be named `*.test.js`, or it won't be picked up.
- [ ] Any schema change is made in both `src/db/seed.js` and `tests/schema.js`
- [ ] `npm test` passes
