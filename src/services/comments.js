const commentsQueries = require('../db/queries/comments');
const tasksQueries = require('../db/queries/tasks');
const usersQueries = require('../db/queries/users');
const { isNonEmptyString } = require('../utils/validation');
const { httpError } = require('../utils/http-error');

function assertTaskExists(taskId) {
  if (!tasksQueries.findTaskById(taskId)) throw httpError(404, 'Task not found');
}

function listCommentsForTask(taskId) {
  assertTaskExists(taskId);
  return commentsQueries.findCommentsForTask(taskId);
}

function createComment(taskId, { user_id, body }) {
  assertTaskExists(taskId);
  if (!body || !isNonEmptyString(body)) throw httpError(400, 'body is required');
  if (!user_id) throw httpError(400, 'user_id is required');
  if (!usersQueries.findUserById(parseInt(user_id))) throw httpError(400, 'user not found');

  const result = commentsQueries.insertComment(taskId, parseInt(user_id), body);
  return commentsQueries.findCommentById(result.lastInsertRowid);
}

module.exports = { listCommentsForTask, createComment };
