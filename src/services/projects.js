const projectsQueries = require('../db/queries/projects');
const { isNonEmptyString } = require('../utils/validation');
const { httpError } = require('../utils/http-error');

function listProjects() {
  return projectsQueries.listProjects();
}

function getProject(id) {
  const project = projectsQueries.findProjectById(id);
  if (!project) throw httpError(404, 'Project not found');
  return project;
}

function getProjectStats(projectId) {
  const stats = { total: 0, active: 0, completed: 0, archived: 0 };
  for (const row of projectsQueries.countTasksByStatus(projectId)) {
    stats[row.status] = row.count;
    stats.total += row.count;
  }
  return stats;
}

function getProjectWithStats(id) {
  const project = getProject(id);
  return { ...project, stats: getProjectStats(id) };
}

function createProject({ name, description, owner_id }) {
  if (!name || !isNonEmptyString(name)) throw httpError(400, 'name is required');
  const result = projectsQueries.insertProject(name, description || null, owner_id || null);
  return projectsQueries.findProjectById(result.lastInsertRowid);
}

function updateProject(id, data) {
  const existing = getProject(id);
  const name = data.name !== undefined ? data.name : existing.name;
  const description = data.description !== undefined ? data.description : existing.description;
  const ownerId = data.owner_id !== undefined ? data.owner_id : existing.owner_id;
  projectsQueries.updateProject(id, name, description, ownerId);
  return projectsQueries.findProjectById(id);
}

function deleteProject(id) {
  const result = projectsQueries.deleteProject(id);
  if (result.changes === 0) throw httpError(404, 'Project not found');
  return { deleted: true };
}

module.exports = { listProjects, getProjectWithStats, createProject, updateProject, deleteProject };
