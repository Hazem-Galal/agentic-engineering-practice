// Pre-commit check: runs the test suite, then boots the real server and
// confirms it answers GET /health. Exits non-zero if either step fails.
const { spawn, spawnSync } = require('child_process');
const net = require('net');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STARTUP_TIMEOUT_MS = 10000;

function runTests() {
  console.log('verify-app: running test suite...');
  const result = spawnSync('npx', ['jest', '--silent'], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  return result.status === 0;
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForHealth(port) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${port}/health`);
      const body = await res.json();
      if (res.status === 200 && body.status === 'ok') return true;
    } catch {
      // server not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

async function checkServer() {
  const port = await findFreePort();
  console.log(`verify-app: starting server on port ${port}...`);
  // NODE_ENV=test uses an in-memory DB, so the check never touches taskr.db
  const child = spawn(process.execPath, ['src/index.js'], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: 'test', PORT: String(port) },
    stdio: 'ignore',
  });
  try {
    return await waitForHealth(port);
  } finally {
    child.kill();
  }
}

async function main() {
  if (!runTests()) {
    console.error('verify-app: FAILED - test suite did not pass');
    process.exit(1);
  }
  if (!(await checkServer())) {
    console.error(`verify-app: FAILED - server did not answer GET /health within ${STARTUP_TIMEOUT_MS / 1000}s`);
    process.exit(1);
  }
  console.log('verify-app: OK - tests passed and server is healthy');
}

main();
