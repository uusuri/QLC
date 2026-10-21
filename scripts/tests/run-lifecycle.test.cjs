const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '../..');

// Run the actual launcher against fake tools: no cluster, Docker or network is used.
const mockTool = `#!${process.execPath}\n` + String.raw`
const fs = require('node:fs');
const path = require('node:path');
const tool = path.basename(process.argv[1]);
const args = process.argv.slice(2);
const state = process.env.QLC_LIFECYCLE_TEST_STATE;
const event = (name) => fs.appendFileSync(path.join(state, 'events'), name + '\n');
if (tool === 'minikube' || tool === 'kubectl') {
  fs.appendFileSync(path.join(state, 'commands'), JSON.stringify({ tool, args }) + '\n');
}
const exists = (name) => fs.existsSync(path.join(state, name));
const exit = (code = 0) => process.exit(code);
const service = (name) => {
  fs.writeFileSync(path.join(state, name + '.pid'), String(process.pid));
  fs.writeFileSync(path.join(state, name + '.ready'), '');
  event(name + '.start');
  process.on('SIGTERM', () => { event(name + '.stop'); exit(); });
  setInterval(() => {}, 1000);
};
switch (tool) {
  case 'docker':
    if (args[0] === 'info') exit();
    if (args.includes('up')) event('compose.up.' + args.slice(args.indexOf('up') + 1).join(' '));
    if (args.includes('redis-cli')) console.log('PONG');
    exit();
    break;
  case 'minikube':
    if (args.includes('status')) {
      event('minikube.status');
      exit(process.env.MOCK_CLUSTER_RUNNING === '1' ? 0 : 7);
    }
    if (args.includes('start')) {
      event('minikube.start');
      if (process.env.MOCK_CLUSTER_START_BLOCK === '1') { service('cluster-start'); break; }
      exit(process.env.MOCK_CLUSTER_START_FAIL === '1' ? 1 : 0);
    }
    if (args.includes('stop')) { event('minikube.stop'); exit(); }
    throw new Error('Unexpected minikube command');
  case 'kubectl':
    if (args.includes('apply')) { event('redis.apply'); exit(); }
    if (args.includes('rollout')) {
      if (process.env.MOCK_ROLLOUT_BLOCK === '1') { service('rollout'); break; }
      event('redis.ready');
      exit();
    }
    if (args.includes('port-forward')) {
      if (process.env.MOCK_FORWARD_FAIL === '1') { event('forward.fail'); exit(1); }
      service('forward');
      break;
    }
    throw new Error('Unexpected kubectl command');
  case 'java':
    service('backend');
    break;
  case 'gradlew':
    event('backend.build');
    exit(process.env.MOCK_BUILD_FAIL === '1' ? 1 : 0);
    break;
  case 'npm':
    event('npm.' + args.join('.'));
    exit();
    break;
  case 'git':
    if (args.includes('--show-current')) console.log(process.env.MOCK_GIT_BRANCH || 'main');
    if (args.includes('--porcelain') && process.env.MOCK_GIT_DIRTY === '1') console.log(' M fixture');
    exit();
    break;
  case 'node':
    if (args[0] !== '-e') { service('frontend'); break; }
    if (args[1].includes('createServer')) {
      exit(process.env.MOCK_REDIS_PORT_BUSY === '1' && ['16379', '16380'].includes(args[2]) ? 1 : 0);
    }
    if (args[1].includes('socket.write')) exit(exists('forward.ready') ? 0 : 1);
    exit(exists(args[2] === '3001' || args[2] === '3000' ? 'frontend.ready' : 'backend.ready') ? 0 : 1);
    break;
  default:
    throw new Error('Unexpected tool: ' + tool);
}
`;

async function waitUntil(predicate, diagnostic, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await delay(25);
  }
  throw new Error(diagnostic());
}

function launch(t, overrides = {}, mode = 'dev') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qlc-run-lifecycle-'));
  const state = path.join(root, 'state');
  const bin = path.join(root, 'tools');
  for (const directory of [state, bin, 'backend/build/libs', 'frontend/node_modules', 'kubernetes/dev', 'kubernetes/prod']) {
    fs.mkdirSync(path.isAbsolute(directory) ? directory : path.join(root, directory), { recursive: true });
  }
  fs.copyFileSync(path.join(projectRoot, 'run.sh'), path.join(root, 'run.sh'));
  for (const environment of ['dev', 'prod']) {
    fs.copyFileSync(path.join(projectRoot, 'kubernetes', environment, 'redis.yaml'),
      path.join(root, 'kubernetes', environment, 'redis.yaml'));
  }
  fs.writeFileSync(path.join(root, 'backend/build/libs/QLC-0.0.1-SNAPSHOT.jar'), 'fixture');
  fs.writeFileSync(path.join(state, 'events'), '');
  fs.writeFileSync(path.join(state, 'commands'), '');
  for (const name of ['docker', 'minikube', 'kubectl', 'java', 'node', 'npm', 'git', 'gradlew']) {
    fs.writeFileSync(path.join(bin, name), mockTool, { mode: 0o755 });
  }
  fs.symlinkSync(path.join(bin, 'gradlew'), path.join(root, 'backend/gradlew'));
  const settings = [
    'SPRING_PROFILES_ACTIVE=' + mode,
    'SPRING_LOCAL_PORT=' + (mode === 'prod' ? '8080' : '8081'),
    'POSTGRES_HOST=127.0.0.1',
    'POSTGRES_PASSWORD=fixture',
    'REDIS_HOST=127.0.0.1',
    'REDIS_PORT=' + (mode === 'prod' ? '16380' : '16379'),
    ...(mode === 'prod' ? ['SPRING_DATASOURCE_URL=jdbc:postgresql://fixture/qlc?sslmode=require'] : []),
  ];
  fs.writeFileSync(path.join(root, '.env.' + mode), settings.join('\n') + '\n');
  const child = spawn('bash', [path.join(root, 'run.sh'), mode], {
    cwd: root,
    detached: true,
    env: { ...process.env, ...overrides, PATH: bin + path.delimiter + process.env.PATH, QLC_LIFECYCLE_TEST_STATE: state },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  let finished = false;
  let result;
  child.stdout.setEncoding('utf8').on('data', (chunk) => { output += chunk; });
  child.stderr.setEncoding('utf8').on('data', (chunk) => { output += chunk; });
  child.once('exit', (code, signal) => { result = { code, signal }; finished = true; });
  const events = () => fs.readFileSync(path.join(state, 'events'), 'utf8').trim().split('\n').filter(Boolean);
  const diagnostic = () => 'Launcher did not reach expected state:\n' + output + '\n' + events().join('\n');
  t.after(async () => {
    if (!finished) {
      child.kill('SIGTERM');
      await waitUntil(() => finished, diagnostic).catch(() => {});
    }
    // Only the isolated process group created by this fixture can be terminated.
    try { process.kill(-child.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
    fs.rmSync(root, { recursive: true, force: true });
  });
  return {
    child,
    events,
    commands: () => fs.readFileSync(path.join(state, 'commands'), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse),
    ready: () => waitUntil(() => output.includes(mode + ' готов:'), diagnostic),
    event: (name) => waitUntil(() => events().includes(name), diagnostic),
    done: async () => { await waitUntil(() => finished, diagnostic); return result; },
    killForward: () => process.kill(Number(fs.readFileSync(path.join(state, 'forward.pid'), 'utf8')), 'SIGTERM'),
  };
}

function assertKubernetesTarget(fixture, mode) {
  const profile = mode === 'prod' ? 'qlc-prod' : 'minikube';
  const namespace = 'qlc-' + mode;
  const commands = fixture.commands();
  assert.ok(commands.some(({ tool }) => tool === 'minikube'));
  assert.ok(commands.some(({ tool }) => tool === 'kubectl'));
  for (const { tool, args } of commands) {
    if (tool === 'minikube') assert.ok(args.includes('--profile=' + profile));
    if (tool === 'kubectl') {
      assert.ok(args.includes('--context=' + profile));
      if (args.includes('-n')) assert.equal(args[args.indexOf('-n') + 1], namespace);
      if (args.includes('apply')) assert.ok(args[args.indexOf('-f') + 1].endsWith('/kubernetes/' + mode + '/redis.yaml'));
      if (args.includes('port-forward')) assert.ok(args.includes(mode === 'prod' ? '16380:6379' : '16379:6379'));
    }
  }
}

test('dev starts Kubernetes and shuts down children before stopping the cluster on Ctrl+C', async (t) => {
  const fixture = launch(t);
  await fixture.ready();
  fixture.child.kill('SIGINT');
  assert.equal((await fixture.done()).code, 130);
  const events = fixture.events();
  assert.ok(events.includes('minikube.start'));
  assert.ok(events.includes('redis.apply'));
  assert.ok(events.includes('compose.up.-d postgres'));
  assert.ok(!events.includes('compose.up.-d redis'));
  for (const name of ['frontend', 'backend', 'forward']) {
    assert.ok(events.includes(name + '.stop'));
    assert.ok(events.indexOf(name + '.stop') < events.indexOf('minikube.stop'));
  }
  assertKubernetesTarget(fixture, 'dev');
});

test('dev also stops an already running minikube profile, without starting it again', async (t) => {
  const fixture = launch(t, { MOCK_CLUSTER_RUNNING: '1' });
  await fixture.ready();
  fixture.child.kill('SIGTERM');
  assert.equal((await fixture.done()).code, 143);
  assert.ok(!fixture.events().includes('minikube.start'));
  assert.ok(fixture.events().includes('minikube.stop'));
});

test('losing port-forward stops the application and Kubernetes', async (t) => {
  const fixture = launch(t);
  await fixture.ready();
  fixture.killForward();
  assert.equal((await fixture.done()).code, 1);
  for (const event of ['backend.stop', 'frontend.stop', 'minikube.stop']) assert.ok(fixture.events().includes(event));
});

test('port-forward startup failure cleans up Kubernetes without launching the application', async (t) => {
  const fixture = launch(t, { MOCK_FORWARD_FAIL: '1' });
  assert.equal((await fixture.done()).code, 1);
  assert.ok(fixture.events().includes('minikube.stop'));
  assert.ok(!fixture.events().includes('backend.start'));
});

test('an occupied Redis port does not start or stop Kubernetes', async (t) => {
  const fixture = launch(t, { MOCK_REDIS_PORT_BUSY: '1' });
  assert.equal((await fixture.done()).code, 1);
  assert.deepEqual(fixture.events(), []);
});

test('build failure leaves Kubernetes alone', async (t) => {
  const fixture = launch(t, { MOCK_BUILD_FAIL: '1' });
  assert.equal((await fixture.done()).code, 1);
  assert.deepEqual(fixture.events(), ['backend.build']);
});

test('partially failed minikube startup is followed by stop', async (t) => {
  const fixture = launch(t, { MOCK_CLUSTER_START_FAIL: '1' });
  assert.equal((await fixture.done()).code, 1);
  assert.ok(fixture.events().includes('minikube.start'));
  assert.ok(fixture.events().includes('minikube.stop'));
  assert.ok(!fixture.events().includes('forward.start'));
});

test('interrupting minikube startup terminates the startup process and stops the cluster', async (t) => {
  const fixture = launch(t, { MOCK_CLUSTER_START_BLOCK: '1' });
  await fixture.event('cluster-start.start');
  fixture.child.kill('SIGTERM');
  assert.equal((await fixture.done()).code, 143);
  assert.ok(fixture.events().includes('cluster-start.stop'));
  assert.ok(fixture.events().includes('minikube.stop'));
});

test('Ctrl+C while waiting for Redis stops rollout and Kubernetes', async (t) => {
  const fixture = launch(t, { MOCK_ROLLOUT_BLOCK: '1' });
  await fixture.event('rollout.start');
  fixture.child.kill('SIGINT');
  assert.equal((await fixture.done()).code, 130);
  assert.ok(fixture.events().includes('rollout.stop'));
  assert.ok(fixture.events().includes('minikube.stop'));
  assert.ok(!fixture.events().includes('backend.start'));
});

test('prod starts and stops its own Kubernetes profile without using Compose', async (t) => {
  const fixture = launch(t, {}, 'prod');
  await fixture.ready();
  fixture.child.kill('SIGTERM');
  assert.equal((await fixture.done()).code, 143);
  for (const event of ['minikube.start', 'redis.apply', 'forward.start', 'backend.stop', 'frontend.stop', 'forward.stop', 'minikube.stop']) {
    assert.ok(fixture.events().includes(event));
  }
  assert.ok(!fixture.events().some((event) => event.startsWith('compose.')));
  assertKubernetesTarget(fixture, 'prod');
});

test('losing the prod port-forward stops only the prod profile', async (t) => {
  const fixture = launch(t, {}, 'prod');
  await fixture.ready();
  fixture.killForward();
  assert.equal((await fixture.done()).code, 1);
  for (const event of ['backend.stop', 'frontend.stop', 'minikube.stop']) assert.ok(fixture.events().includes(event));
  assertKubernetesTarget(fixture, 'prod');
});

test('prod refuses a non-main branch before touching Kubernetes', async (t) => {
  const fixture = launch(t, { MOCK_GIT_BRANCH: 'develop' }, 'prod');
  assert.equal((await fixture.done()).code, 1);
  assert.deepEqual(fixture.events(), []);
  assert.deepEqual(fixture.commands(), []);
});

test('prod refuses a dirty checkout before touching Kubernetes', async (t) => {
  const fixture = launch(t, { MOCK_GIT_DIRTY: '1' }, 'prod');
  assert.equal((await fixture.done()).code, 1);
  assert.deepEqual(fixture.events(), []);
  assert.deepEqual(fixture.commands(), []);
});

test('an occupied prod Redis port leaves both clusters alone', async (t) => {
  const fixture = launch(t, { MOCK_REDIS_PORT_BUSY: '1' }, 'prod');
  assert.equal((await fixture.done()).code, 1);
  assert.deepEqual(fixture.events(), []);
  assert.deepEqual(fixture.commands(), []);
});
