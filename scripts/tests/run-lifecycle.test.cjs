const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

// All external commands are replaced. No real cluster, container or application is started.
const helper = String.raw`
const fs = require('node:fs');
const path = require('node:path');
const command = path.basename(process.argv[1]);
const args = process.argv.slice(2);
const root = process.env.MOCK_ROOT;
const event = (type, data = {}) => fs.appendFileSync(root + '/events', JSON.stringify({type, command, args, pid:process.pid, ...data}) + '\n');
event('command');
function serve(kind) {
  fs.writeFileSync(root + '/' + kind + '.pid', String(process.pid));
  event('start', {kind, jwt:!!process.env.JWT_SECRET, mail:!!process.env.RESEND_API_KEY, port:process.env.WORKER_MANAGEMENT_PORT});
  process.on('SIGTERM', () => { event('stop', {kind}); process.exit(0); });
  setInterval(() => {}, 1000);
}
if (command === 'git' && args.includes('--show-current')) { console.log('main'); }
else if (command === 'kubectl' && args.includes('port-forward')) { serve('forward'); }
else if (command === 'java') {
  const kind = args.some(arg => arg.endsWith('qlc-worker.jar')) ? 'worker' : 'api';
  if (kind === 'worker' && process.env.MOCK_FAIL_WORKER === 'true') { event('failed', {kind}); process.exit(42); }
  serve(kind);
} else if (command === 'node' && args[0] !== '-e') { serve('frontend'); }
else if (command === 'node' && args[0] === '-e') {
  const script = args[1];
  if (script.includes('server.listen')) process.exit(0);
  let kind = 'forward';
  if (!script.includes('PING')) {
    const port = Number(args[2]);
    kind = [3000,3001].includes(port) ? 'frontend' : [9093,9094].includes(port) ? 'worker' : 'api';
  }
  try { process.kill(Number(fs.readFileSync(root + '/' + kind + '.pid', 'utf8')), 0); }
  catch { process.exit(1); }
}
`;

async function until(predicate, getOutput, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  throw new Error('Timed out: ' + getOutput());
}

function fixture(t, mode = 'dev', extraEnv = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qlc-run-test-'));
  for (const dir of ['bin', 'backend/api/build/libs', 'backend/worker/build/libs', 'frontend/node_modules', 'kubernetes/'+mode]) {
    fs.mkdirSync(path.join(root,dir), {recursive:true});
  }
  fs.copyFileSync(path.resolve(__dirname,'../../run.sh'), root+'/run.sh');
  for (const kind of ['api','worker']) fs.writeFileSync(root+'/backend/'+kind+'/build/libs/qlc-'+kind+'.jar','');
  fs.writeFileSync(root+'/events','');
  fs.writeFileSync(root+'/mock.cjs', '#!'+process.execPath+'\n'+helper, {mode:0o755});
  for (const command of ['docker','java','node','npm','kubectl','minikube','git']) fs.symlinkSync(root+'/mock.cjs', root+'/bin/'+command);
  fs.symlinkSync(root+'/mock.cjs', root+'/backend/gradlew');
  fs.writeFileSync(root+'/.env.'+mode, [
    'SPRING_PROFILES_ACTIVE='+mode,
    'SPRING_LOCAL_PORT='+(mode === 'dev' ? '8081' : '8080'),
    'REDIS_HOST=127.0.0.1',
    'REDIS_PORT='+(mode === 'dev' ? '16379' : '16380'),
    'POSTGRES_HOST=127.0.0.1',
    'POSTGRES_PASSWORD=fixture-only',
    'JWT_SECRET=fixture-only',
    'RESEND_API_KEY=fixture-only',
    ...(mode === 'prod' ? ['SPRING_DATASOURCE_URL=jdbc:postgresql://fixture.invalid/test?sslmode=require'] : []),
  ].join('\n')+'\n');
  const env = {...process.env, PATH:root+'/bin:'+process.env.PATH, MOCK_ROOT:root};
  for (const key of ['MANAGEMENT_LOCAL_PORT','WORKER_MANAGEMENT_PORT','MOCK_FAIL_WORKER','SPRING_DATASOURCE_URL']) delete env[key];
  const child = spawn('/bin/bash', [root+'/run.sh', mode], {env:{...env,...extraEnv}, detached:true});
  let output = '';
  child.stdout.on('data', chunk => output += chunk);
  child.stderr.on('data', chunk => output += chunk);
  const done = new Promise(resolve => child.once('exit', (code, signal) => resolve({code, signal})));
  const events = () => fs.readFileSync(root+'/events','utf8').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    await until(() => child.exitCode !== null || child.signalCode !== null, () => output, 20000).catch(() => {
      try { process.kill(-child.pid,'SIGKILL'); } catch {}
    });
    // Only known fixture processes can be affected; never inspect or kill real application ports.
    for (const kind of ['api','worker','frontend','forward']) {
      try { process.kill(Number(fs.readFileSync(root+'/'+kind+'.pid','utf8')),'SIGTERM'); } catch {}
    }
    fs.rmSync(root, {recursive:true, force:true});
  });
  return {child, done, events, output:()=>output};
}

function assertStopped(events, kinds) {
  for (const kind of kinds) assert.ok(events.some(e=>e.type === 'stop' && e.kind === kind), kind+' was not stopped');
  assert.ok(events.some(e=>e.command === 'minikube' && e.args.includes('stop')));
}

for (const mode of ['dev','prod']) test(mode+': starts API then worker; stops both and keeps API secrets out of worker', {timeout:30000}, async t => {
  const f = fixture(t,mode);
  await until(()=>f.output().includes(mode+' готов:'), f.output);
  const started = f.events().filter(e=>e.type === 'start');
  assert.deepEqual(started.map(e=>e.kind), ['forward','api','worker','frontend']);
  assert.equal(started.find(e=>e.kind === 'worker').port, mode === 'dev' ? '9094' : '9093');
  assert.equal(started.find(e=>e.kind === 'worker').jwt, false);
  assert.equal(started.find(e=>e.kind === 'worker').mail, false);
  assert.equal(started.find(e=>e.kind === 'api').jwt, true);
  assert.ok(f.events().some(e=>e.command === 'gradlew' && e.args.includes(':api:bootJar') && e.args.includes(':worker:bootJar')));
  f.child.kill('SIGTERM');
  assert.equal((await f.done).code,143);
  assertStopped(f.events(),['api','worker','frontend','forward']);
});

test('worker startup failure stops API and port-forward without starting frontend', {timeout:30000}, async t => {
  const f = fixture(t,'dev',{MOCK_FAIL_WORKER:'true'});
  assert.equal((await f.done).code,1);
  assert.match(f.output(),/Worker завершился при запуске/);
  assertStopped(f.events(),['api','forward']);
  assert.equal(f.events().some(e=>e.type === 'start' && e.kind === 'frontend'),false);
});

test('worker failure after readiness shuts down the rest of the environment', {timeout:30000}, async t => {
  const f = fixture(t);
  await until(()=>f.output().includes('dev готов:'), f.output);
  const worker = f.events().find(e=>e.type === 'start' && e.kind === 'worker');
  process.kill(worker.pid,'SIGTERM');
  assert.equal((await f.done).code,1);
  assertStopped(f.events(),['api','worker','frontend','forward']);
});
