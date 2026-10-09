const express = require('express');
const { PORT } = require('./utils/constants');
const { requestLogger } = require('./middleware/request-logger');
const { errorHandler } = require('./middleware/error-handler');
const { rootRouter } = require('./routes/root');
const { usersRouter } = require('./routes/users');
const { projectsRouter } = require('./routes/projects');
const { tasksRouter } = require('./routes/tasks');
const { commentsRouter } = require('./routes/comments');
const { tagsRouter, taskTagsRouter } = require('./routes/tags');
const { webhooksRouter } = require('./routes/webhooks');

const app = express();

app.use(express.json());
app.use(requestLogger);

app.use('/', rootRouter);
app.use('/users', usersRouter);
app.use('/projects', projectsRouter);
app.use('/tasks/:id/comments', commentsRouter);
app.use('/tasks/:id/tags', taskTagsRouter);
app.use('/tasks', tasksRouter);
app.use('/tags', tagsRouter);
app.use('/webhooks', webhooksRouter);

app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Taskr API running on port ${PORT}`);
  });
}

module.exports = app;
