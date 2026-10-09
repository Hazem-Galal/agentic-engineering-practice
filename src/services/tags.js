const tagsQueries = require('../db/queries/tags');
const tasksQueries = require('../db/queries/tasks');
const { isUniqueViolation } = require('../db/errors');
const { isNonEmptyString } = require('../utils/validation');
const { httpError } = require('../utils/http-error');

function listTags() {
  return tagsQueries.listTags();
}

function createTag({ name }) {
  if (!name || !isNonEmptyString(name)) throw httpError(400, 'name is required');
  try {
    const result = tagsQueries.insertTag(name.toLowerCase().trim());
    return tagsQueries.findTagById(result.lastInsertRowid);
  } catch (err) {
    if (isUniqueViolation(err)) throw httpError(409, 'tag already exists');
    throw err;
  }
}

function addTagToTask(taskId, { tag_id }) {
  if (!tasksQueries.findTaskById(taskId)) throw httpError(404, 'Task not found');
  if (!tag_id) throw httpError(400, 'tag_id is required');
  const tagId = parseInt(tag_id);
  if (!tagsQueries.findTagById(tagId)) throw httpError(404, 'Tag not found');

  try {
    tagsQueries.insertTaskTag(taskId, tagId);
  } catch (err) {
    if (isUniqueViolation(err)) throw httpError(409, 'tag already applied to this task');
    throw err;
  }
  return { task_id: taskId, tag_id: tagId };
}

function removeTagFromTask(taskId, tagId) {
  const result = tagsQueries.deleteTaskTag(taskId, tagId);
  if (result.changes === 0) throw httpError(404, 'Tag not applied to this task');
  return { deleted: true };
}

module.exports = { listTags, createTag, addTagToTask, removeTagFromTask };
