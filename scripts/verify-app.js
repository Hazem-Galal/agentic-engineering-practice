// Pre-commit check: runs the test suite, then boots the real server and
// confirms it answers GET /health. Exits non-zero if either step fails.
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STARTUP_TIMEOUT_MS = 10000;
const HEALTH_REQUEST_TIMEOUT_MS = 1000;

// Returns an error message, or null if every test ran and passed.
function runTests() {
  console.log('verify-app: running test suite...');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-app-'));
  const resultsFile = path.join(tmpDir, 'results.json');
  try {
    // Run Jest's bin with node directly: no shell, so paths with spaces
    // (common in Windows temp dirs) reach Jest as a single argument
    const jestBin = require.resolve('jest/bin/jest', { paths: [ROOT] });
    const result = spawnSync(process.execPath, [jestBin, '--silent', '--json', `--outputFile=${resultsFile}`], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    if (result.status !== 0) return 'test suite did not pass';
    // Jest exits 0 when tests are skipped (.only, .skip) or marked .todo,
    // but a passing run must have run every test
    const { numPendingTests, numTodoTests } = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    if (numPendingTests > 0 || numTodoTests > 0) {
      return `${numPendingTests} skipped and ${numTodoTests} todo test(s); remove .only/.skip/.todo`;
    }
    return null;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
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

async function isHealthy(port) {
  try {
    const res = await fetch(`http://localhost:${port}/health`, {
      signal: AbortSignal.timeout(HEALTH_REQUEST_TIMEOUT_MS),
    });
    const body = await res.json();
    return res.status === 200 && body.status === 'ok';
  } catch {
    return false; // not listening yet, or the request timed out
  }
}

// Returns an error message, or null if the server answered GET /health.
async function checkServer() {
  const port = await findFreePort();
  console.log(`verify-app: starting server on port ${port}...`);
  // NODE_ENV=test uses an in-memory DB, so the check never touches taskr.db
  const child = spawn(process.execPath, ['src/index.js'], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: 'test', PORT: String(port) },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  let exitCode = null;
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('exit', (code, signal) => { exitCode = code ?? signal; });

  try {
    const deadline = Date.now() + STARTUP_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (exitCode !== null) {
        return `server exited during startup (${exitCode})\n${stderr.trim()}`;
      }
      if (await isHealthy(port)) return null;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return `server did not answer GET /health within ${STARTUP_TIMEOUT_MS / 1000}s`;
  } finally {
    child.kill();
  }
}

async function main() {
  const failure = runTests() || (await checkServer());
  if (failure) {
    console.error(`verify-app: FAILED - ${failure}`);
    process.exit(1);
  }
  console.log('verify-app: OK - tests passed and server is healthy');
}

main();
