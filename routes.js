/*
 * routes.js
 *
 * All API routes for Taskr. This file handles users, projects, tasks, comments,
 * and tags. Route handlers query the database directly — there is no service
 * layer. Validation is inline in each handler. This file is long by design.
 *
 * TODO: split into separate route files per resource
 * TODO: extract database queries into a repository layer
 * TODO: extract validation into shared middleware
 */

const express = require('express');
const router = express.Router();
const { db } = require('./src/db/connection');
const { authenticate } = require('./src/middleware/authenticate');
const { validateEmail, isNonEmptyString } = require('./src/utils/validation');
const { VALID_TASK_STATUSES } = require('./src/utils/constants');

// ─── Health ──────────────────────────────────────────────────────────────────

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
