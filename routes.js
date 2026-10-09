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

// ─── Tags ─────────────────────────────────────────────────────────────────────

router.get('/tags', (req, res) => {
  const tags = db.prepare('SELECT * FROM tags ORDER BY name ASC').all();
  res.json(tags);
});

router.post('/tags', (req, res) => {
  const { name } = req.body;
  if (!name || !isNonEmptyString(name)) {
    return res.status(400).json({ error: 'name is required' });
  }
  try {
    const result = db.prepare('INSERT INTO tags (name) VALUES (?)').run(name.toLowerCase().trim());
    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(tag);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'tag already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.post('/tasks/:id/tags', (req, res) => {
  const taskId = parseInt(req.params.id);
  const { tag_id } = req.body;

  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (!tag_id) return res.status(400).json({ error: 'tag_id is required' });
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(parseInt(tag_id));
  if (!tag) return res.status(404).json({ error: 'Tag not found' });

  try {
    db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)').run(taskId, parseInt(tag_id));
    res.status(201).json({ task_id: taskId, tag_id: parseInt(tag_id) });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'tag already applied to this task' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.delete('/tasks/:id/tags/:tagId', (req, res) => {
  const taskId = parseInt(req.params.id);
  const tagId = parseInt(req.params.tagId);
  const result = db.prepare(
    'DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?'
  ).run(taskId, tagId);
  if (result.changes === 0) return res.status(404).json({ error: 'Tag not applied to this task' });
  res.json({ deleted: true });
});

module.exports = router;
