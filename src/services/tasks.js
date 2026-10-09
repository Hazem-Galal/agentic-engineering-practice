const tasksQueries = require('../db/queries/tasks');
const projectsQueries = require('../db/queries/projects');
const usersQueries = require('../db/queries/users');
const tagsQueries = require('../db/queries/tags');
const commentsQueries = require('../db/queries/comments');
const { isNonEmptyString } = require('../utils/validation');
const { httpError } = require('../utils/http-error');
const { VALID_TASK_STATUSES, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('../utils/constants');

function assertValidStatus(status) {
  if (status && !VALID_TASK_STATUSES.includes(status)) {
    throw httpError(400, `status must be one of: ${VALID_TASK_STATUSES.join(', ')}`);
  }
}

function getExistingTask(id) {
  const task = tasksQueries.findTaskById(id);
  if (!task) throw httpError(404, 'Task not found');
  return task;
}

function listTasks({ status, project_id, assignee_id, page, page_size }) {
  assertValidStatus(status);
  const limit = Math.min(MAX_PAGE_SIZE, parseInt(page_size) || DEFAULT_PAGE_SIZE);
  const offset = ((parseInt(page) || 1) - 1) * limit;

  return tasksQueries.findTasks({
    status: status || undefined,
    projectId: project_id ? parseInt(project_id) : undefined,
    assigneeId: assignee_id ? parseInt(assignee_id) : undefined,
    limit,
    offset
  });
}

function getTaskById(id) {
  const task = getExistingTask(id);
  task.tags = tagsQueries.findTagsForTask(id);
  task.comments = commentsQueries.findCommentsForTask(id);
  return task;
}

function createTask({ title, description, project_id, assignee_id, due_date }) {
  if (!title || !isNonEmptyString(title)) throw httpError(400, 'title is required');
  if (project_id && !projectsQueries.findProjectById(parseInt(project_id))) {
    throw httpError(400, 'project not found');
  }
  if (assignee_id && !usersQueries.findUserById(parseInt(assignee_id))) {
    throw httpError(400, 'assignee not found');
  }
  const result = tasksQueries.insertTask({
    title,
    description: description || null,
    projectId: project_id ? parseInt(project_id) : null,
    assigneeId: assignee_id ? parseInt(assignee_id) : null,
    dueDate: due_date || null
  });
  return tasksQueries.findTaskById(result.lastInsertRowid);
}

function updateTask(id, data) {
  const existing = getExistingTask(id);
  const { title, description, status, project_id, assignee_id, due_date } = data;
  assertValidStatus(status);

  const updatedStatus = status !== undefined ? status : existing.status;
  const completedAt = updatedStatus === 'completed' && existing.status !== 'completed'
    ? new Date().toISOString()
    : (updatedStatus !== 'completed' ? null : existing.completed_at);

  tasksQueries.updateTask(id, {
    title: title !== undefined ? title : existing.title,
    description: description !== undefined ? description : existing.description,
    status: updatedStatus,
    projectId: project_id !== undefined ? project_id : existing.project_id,
    assigneeId: assignee_id !== undefined ? assignee_id : existing.assignee_id,
    dueDate: due_date !== undefined ? due_date : existing.due_date,
    completedAt
  });
  return tasksQueries.findTaskById(id);
}

function deleteTask(id) {
  const result = tasksQueries.deleteTask(id);
  if (result.changes === 0) throw httpError(404, 'Task not found');
  return { deleted: true };
}

module.exports = { listTasks, getTaskById, createTask, updateTask, deleteTask };
