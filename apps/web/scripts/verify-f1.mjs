import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer, request as httpRequest } from 'node:http';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const webDirectory = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.F1_TEST_PORT ?? 3310);
const baseUrl = `http://127.0.0.1:${port}`;

function agency(id, slug, name) {
  return {
    id,
    slug,
    name,
    status: 'active',
    timezone: 'America/Hermosillo',
    locale: 'es-MX',
    currency: 'MXN',
  };
}
const agencies = new Map([
  ['alpha.test', agency('01900000-0000-7000-8000-000000000001', 'alpha', 'Alpha original')],
  ['beta.test', agency('01900000-0000-7000-8000-000000000002', 'beta', 'Beta')],
]);
const calls = new Map();
let failing = false;

const upstream = createServer((request, response) => {
  assert.equal(request.url, '/public/tenant');
  assert.equal(request.headers.authorization, undefined);
  const host = request.headers['x-tenant-host'];
  assert.equal(typeof host, 'string');
  calls.set(host, (calls.get(host) ?? 0) + 1);
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Cache-Control', 'no-store');
  if (failing) {
    response.writeHead(500);
    response.end(JSON.stringify({ error: 'Test failure' }));
    return;
  }
  const value = agencies.get(host);
  if (!value) {
    response.writeHead(404);
    response.end(JSON.stringify({ error: 'Not found' }));
    return;
  }
  response.end(JSON.stringify(value));
});
await new Promise((resolve, reject) => {
  upstream.once('error', reject);
  upstream.listen(0, '127.0.0.1', resolve);
});
const address = upstream.address();
assert.ok(address && typeof address !== 'string');

const child = spawn(
  process.execPath,
  [
    require.resolve('next/dist/bin/next'),
    'start',
    '--hostname',
    '127.0.0.1',
    '--port',
    String(port),
  ],
  {
    cwd: webDirectory,
    env: {
      ...process.env,
      API_URL: `http://127.0.0.1:${address.port}`,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_integration_test',
      NEXT_TELEMETRY_DISABLED: '1',
    },
    stdio: ['ignore', 'inherit', 'inherit'],
  },
);
let startupError;
child.on('error', (error) => {
  startupError = error;
});

async function eventually(check, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (startupError) throw startupError;
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error('Next stopped before verification ended.');
    }
    if (await check()) return;
    await delay(100);
  }
  throw new Error('Verification timed out.');
}
// Node fetch discards a custom Host. Use HTTP directly so virtual-host tests
// exercise the exact wire header without changing DNS or the hosts file.
async function localRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      new URL(path, baseUrl),
      {
        method: options.method ?? 'GET',
        headers: options.headers,
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('error', reject);
        response.on('end', () => {
          const headers = new Headers();
          for (let index = 0; index < response.rawHeaders.length; index += 2) {
            headers.append(response.rawHeaders[index], response.rawHeaders[index + 1]);
          }
          const status = response.statusCode ?? 502;
          const body =
            options.method === 'HEAD' || [204, 205, 304].includes(status)
              ? null
              : Buffer.concat(chunks);
          resolve(new Response(body, { status, headers }));
        });
      },
    );
    request.on('error', reject);
    request.setTimeout(15_000, () => request.destroy(new Error('Local test request timed out.')));
    request.end(options.body);
  });
}
async function tenant(host, extraHeaders = {}) {
  return localRequest('/api/public/tenant', { headers: { Host: host, ...extraHeaders } });
}

try {
  await eventually(async () => {
    try {
      const response = await localRequest('/');
      await response.body?.cancel();
      return response.ok;
    } catch {
      return false;
    }
  });
  let response = await tenant('ALPHA.test:3000');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const alpha = await response.json();
  assert.equal(alpha.name, 'Alpha original');
  response = await tenant('beta.test');
  const beta = await response.json();
  assert.notEqual(alpha.id, beta.id);
  response = await tenant('alpha.test', {
    'X-Tenant-Host': 'beta.test',
    'X-Forwarded-Host': 'beta.test',
  });
  assert.equal((await response.json()).id, alpha.id);
  const before = calls.get('alpha.test');
  agencies.set('alpha.test', { ...agencies.get('alpha.test'), name: 'Alpha updated' });
  response = await tenant('alpha.test');
  assert.equal((await response.json()).name, 'Alpha updated');
  assert.equal(calls.get('alpha.test'), before + 1);
  response = await localRequest('/api/cache/agency-domains', { method: 'POST' });
  assert.equal(response.status, 404);
  response = await tenant('new.test');
  assert.equal(response.status, 404);
  agencies.set(
    'new.test',
    agency('01900000-0000-7000-8000-000000000003', 'new-agency', 'New agency'),
  );
  response = await tenant('new.test');
  assert.equal(response.status, 200);
  agencies.set('invalid.test', { invalid: true });
  response = await tenant('invalid.test');
  assert.equal(response.status, 502);
  agencies.set(
    'invalid.test',
    agency('01900000-0000-7000-8000-000000000004', 'fixed-agency', 'Fixed agency'),
  );
  response = await tenant('invalid.test');
  assert.equal(response.status, 200);
  agencies.set('suspended.test', { ...agencies.get('alpha.test'), status: 'suspended' });
  response = await tenant('suspended.test');
  assert.equal(response.status, 404);
  agencies.set('fields.test', {
    ...agencies.get('alpha.test'),
    notificationEmail: 'private@example.test',
  });
  response = await tenant('fields.test');
  assert.equal(Object.hasOwn(await response.json(), 'notificationEmail'), false);
  failing = true;
  response = await tenant('failure.test');
  assert.equal(response.status, 502);
  failing = false;
  response = await tenant('https://invalid.test');
  assert.equal(response.status, 400);
  response = await localRequest('/api/public/tenant', {
    method: 'POST',
    headers: { Host: 'alpha.test' },
  });
  assert.equal(response.status, 405);
  response = await localRequest('/api/public/tenant', {
    method: 'HEAD',
    headers: { Host: 'alpha.test' },
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
  for (const path of ['/api/internal/example', '/api/cron/example']) {
    response = await localRequest(path, { headers: { Host: 'alpha.test' } });
    assert.equal(response.status, 404);
  }
  response = await localRequest('/api/admin/me', { headers: { Host: 'alpha.test' } });
  assert.equal(response.status, 401);
  response = await localRequest('/api/admin/example', {
    method: 'POST',
    headers: {
      Host: 'alpha.test',
      Origin: 'https://another.test',
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  assert.equal(response.status, 403);
  console.log(
    'F1 integration verification passed: fresh tenant lookups, hosts and HTTP boundaries.',
  );
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    const stopped = once(child, 'exit');
    child.kill('SIGTERM');
    await Promise.race([stopped, delay(5_000)]);
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
      await stopped;
    }
  }
  upstream.closeAllConnections();
  await new Promise((resolve) => {
    upstream.close(resolve);
  });
}
