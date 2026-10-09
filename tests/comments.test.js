process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/index');
const { db } = require('../src/db/connection');
const { createSchema } = require('./schema');

beforeAll(() => {
  createSchema(db);
});

beforeEach(() => {
  db.exec('DELETE FROM task_tags; DELETE FROM comments; DELETE FROM tasks; DELETE FROM projects; DELETE FROM users; DELETE FROM tags;');
  db.prepare('INSERT INTO users (id, name, email) VALUES (1, ?, ?)').run('Ada', 'ada@example.com');
  db.prepare('INSERT INTO users (id, name, email) VALUES (2, ?, ?)').run('Grace', 'grace@example.com');
  db.prepare("INSERT INTO tasks (id, title) VALUES (1, 'Write docs')").run();
});

describe('GET /tasks/:id/comments', () => {
  test('returns an empty list when the task has no comments', async () => {
    const res = await request(app).get('/tasks/1/comments');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('lists comments oldest first with the author name', async () => {
    db.prepare("INSERT INTO comments (task_id, user_id, body, created_at) VALUES (1, 2, 'second', '2026-01-02 10:00:00')").run();
    db.prepare("INSERT INTO comments (task_id, user_id, body, created_at) VALUES (1, 1, 'first', '2026-01-01 10:00:00')").run();

    const res = await request(app).get('/tasks/1/comments');

    expect(res.status).toBe(200);
    expect(res.body.map((c) => c.body)).toEqual(['first', 'second']);
    expect(res.body.map((c) => c.user_name)).toEqual(['Ada', 'Grace']);
  });

  test('only returns comments for the requested task', async () => {
    db.prepare("INSERT INTO tasks (id, title) VALUES (2, 'Other task')").run();
    db.prepare("INSERT INTO comments (task_id, user_id, body) VALUES (1, 1, 'mine')").run();
    db.prepare("INSERT INTO comments (task_id, user_id, body) VALUES (2, 1, 'not mine')").run();

    const res = await request(app).get('/tasks/1/comments');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].body).toBe('mine');
  });

  test('returns 404 when the task does not exist', async () => {
    const res = await request(app).get('/tasks/999/comments');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });
});

describe('POST /tasks/:id/comments', () => {
  test('adds a comment and returns it with the author name', async () => {
    const res = await request(app)
      .post('/tasks/1/comments')
      .send({ user_id: 1, body: 'Looks good' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ task_id: 1, user_id: 1, body: 'Looks good', user_name: 'Ada' });
    expect(res.body.id).toBeDefined();

    const list = await request(app).get('/tasks/1/comments');
    expect(list.body).toHaveLength(1);
  });

  test('returns 404 when the task does not exist', async () => {
    const res = await request(app)
      .post('/tasks/999/comments')
      .send({ user_id: 1, body: 'Hello' });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });

  test('returns 400 when the body is missing', async () => {
    const res = await request(app).post('/tasks/1/comments').send({ user_id: 1 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'body is required' });
  });

  test('returns 400 when the body is only whitespace', async () => {
    const res = await request(app).post('/tasks/1/comments').send({ user_id: 1, body: '   ' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'body is required' });
  });

  test('returns 400 when the author is missing', async () => {
    const res = await request(app).post('/tasks/1/comments').send({ body: 'Hello' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'user_id is required' });
  });

  // Current behaviour: an unknown author is a 400, not a 404.
  test('returns 400 when the author does not exist', async () => {
    const res = await request(app).post('/tasks/1/comments').send({ user_id: 999, body: 'Hello' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'user not found' });
  });
});
