const { db } = require('../connection');

function findTagsForTask(taskId) {
  return db.prepare(
    'SELECT t.* FROM tags t JOIN task_tags tt ON tt.tag_id = t.id WHERE tt.task_id = ?'
  ).all(taskId);
}

module.exports = { findTagsForTask };
