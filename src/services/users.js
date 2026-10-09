const usersQueries = require('../db/queries/users');
const { isUniqueViolation } = require('../db/errors');
const { sendEmail } = require('./email');
const { validateEmail, isNonEmptyString } = require('../utils/validation');
const { httpError } = require('../utils/http-error');

function listUsers() {
  return usersQueries.listUsers();
}

function getUserById(id) {
  const user = usersQueries.findUserById(id);
  if (!user) throw httpError(404, 'User not found');
  return user;
}

async function createUser({ name, email }) {
  if (!name || !isNonEmptyString(name)) throw httpError(400, 'name is required');
  if (!email || !isNonEmptyString(email)) throw httpError(400, 'email is required');
  if (!validateEmail(email)) throw httpError(400, 'Invalid email address');

  let result;
  try {
    result = usersQueries.insertUser(name, email);
  } catch (err) {
    if (isUniqueViolation(err)) throw httpError(409, 'email already exists');
    throw err;
  }
  const user = usersQueries.findUserById(result.lastInsertRowid);

  await sendEmail({
    to: user.email,
    subject: 'Welcome to Taskr!',
    body: `Hi ${user.name}, your account is ready. Start managing your tasks at taskr.io.`
  });

  return user;
}

function updateUser(id, data) {
  const existing = getUserById(id);
  const name = data.name !== undefined ? data.name : existing.name;
  const email = data.email !== undefined ? data.email : existing.email;
  usersQueries.updateUser(id, name, email);
  return usersQueries.findUserById(id);
}

function deleteUser(id) {
  const result = usersQueries.deleteUser(id);
  if (result.changes === 0) throw httpError(404, 'User not found');
  return { deleted: true };
}

module.exports = { listUsers, getUserById, createUser, updateUser, deleteUser };
