process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../index');
const { db } = require('../DB');
const { createSchema } = require('./schema');

beforeAll(() => {
  createSchema(db);
});

beforeEach(() => {
  db.exec('DELETE FROM task_tags; DELETE FROM comments; DELETE FROM tasks; DELETE FROM projects; DELETE FROM users; DELETE FROM tags;');
  db.prepare("INSERT INTO tasks (id, title) VALUES (1, 'Write docs')").run();
  db.prepare("INSERT INTO tags (id, name) VALUES (1, 'urgent')").run();
});

describe('GET /tags', () => {
  test('lists tags in alphabetical order', async () => {
    db.prepare("INSERT INTO tags (name) VALUES ('backend')").run();

    const res = await request(app).get('/tags');

    expect(res.status).toBe(200);
    expect(res.body.map((t) => t.name)).toEqual(['backend', 'urgent']);
  });

  test('returns an empty list when there are no tags', async () => {
    db.exec('DELETE FROM tags;');
    const res = await request(app).get('/tags');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /tags', () => {
  test('creates a tag', async () => {
    const res = await request(app).post('/tags').send({ name: 'frontend' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'frontend' });
    expect(res.body.id).toBeDefined();
  });

  test('stores the name lowercase and trimmed', async () => {
    const res = await request(app).post('/tags').send({ name: '  Backend  ' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('backend');
  });

  test('returns 400 when the name is missing', async () => {
    const res = await request(app).post('/tags').send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'name is required' });
  });

  test('returns 400 when the name is only whitespace', async () => {
    const res = await request(app).post('/tags').send({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'name is required' });
  });

  test('rejects a tag that already exists, ignoring case', async () => {
    const res = await request(app).post('/tags').send({ name: 'URGENT' });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'tag already exists' });
  });
});

describe('POST /tasks/:id/tags', () => {
  test('attaches a tag to a task', async () => {
    const res = await request(app).post('/tasks/1/tags').send({ tag_id: 1 });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ task_id: 1, tag_id: 1 });

    const task = await request(app).get('/tasks/1');
    expect(task.body.tags.map((t) => t.name)).toEqual(['urgent']);
  });

  test('returns 404 when the task does not exist', async () => {
    const res = await request(app).post('/tasks/999/tags').send({ tag_id: 1 });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });

  test('returns 400 when the tag is missing', async () => {
    const res = await request(app).post('/tasks/1/tags').send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'tag_id is required' });
  });

  test('returns 404 when the tag does not exist', async () => {
    const res = await request(app).post('/tasks/1/tags').send({ tag_id: 999 });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Tag not found' });
  });

  test('rejects attaching the same tag twice', async () => {
    db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (1, 1)').run();
    const res = await request(app).post('/tasks/1/tags').send({ tag_id: 1 });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'tag already applied to this task' });
  });
});

describe('DELETE /tasks/:id/tags/:tagId', () => {
  test('removes a tag from a task', async () => {
    db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (1, 1)').run();

    const res = await request(app).delete('/tasks/1/tags/1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });
    const task = await request(app).get('/tasks/1');
    expect(task.body.tags).toEqual([]);
  });

  test('returns 404 when the tag is not on the task', async () => {
    const res = await request(app).delete('/tasks/1/tags/1');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Tag not applied to this task' });
  });

  test('returns 404 when the task does not exist', async () => {
    const res = await request(app).delete('/tasks/999/tags/1');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Tag not applied to this task' });
  });
});
