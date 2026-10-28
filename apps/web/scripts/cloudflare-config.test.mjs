import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { deploymentConfig, deploymentProblems, parseWranglerConfig } from './cloudflare-config.mjs';

const base = parseWranglerConfig(
  await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'),
);
const env = {
  WEB_CACHE_STAGING_D1_ID: '11111111-1111-4111-8111-111111111111',
  WEB_CACHE_PREVIEW_D1_ID: '22222222-2222-4222-8222-222222222222',
  AGENCY_CACHE_REVALIDATION_SECRET: 'a'.repeat(64),
  CLOUDFLARE_API_TOKEN: 'test-only-token',
  CLOUDFLARE_ACCOUNT_ID: 'test-only-account',
};

test('an unconfigured machine cannot publish the local-only binding IDs', () => {
  assert.ok(deploymentProblems({}).length > 0);
  assert.throws(() => deploymentConfig(base, {}));
});
test('local fixture IDs cannot be mistaken for deployment resources', () => {
  assert.throws(() =>
    deploymentConfig(base, { ...env, WEB_CACHE_STAGING_D1_ID: base.d1_databases[0].database_id }),
  );
});
test('staging and preview cannot share the D1 invalidation store', () => {
  assert.throws(() =>
    deploymentConfig(base, { ...env, WEB_CACHE_PREVIEW_D1_ID: env.WEB_CACHE_STAGING_D1_ID }),
  );
});
test('maintenance credentials must be valid before any deployment operation', () => {
  for (const secret of ['', 'short', `${'a'.repeat(32)}\n`]) {
    assert.throws(() =>
      deploymentConfig(base, { ...env, AGENCY_CACHE_REVALIDATION_SECRET: secret }),
    );
  }
});
test('generated configuration separates resources without embedding credentials', () => {
  const generated = deploymentConfig(base, env);
  assert.equal(generated.d1_databases[0].database_id, env.WEB_CACHE_STAGING_D1_ID);
  assert.equal(generated.previews.d1_databases[0].database_id, env.WEB_CACHE_PREVIEW_D1_ID);
  assert.equal(
    generated.env['cache-preview'].d1_databases[0].database_id,
    env.WEB_CACHE_PREVIEW_D1_ID,
  );
  assert.notEqual(
    generated.r2_buckets[0].bucket_name,
    generated.previews.r2_buckets[0].bucket_name,
  );
  assert.deepEqual(generated.previews.services, []);
  assert.equal(JSON.stringify(generated).includes(env.AGENCY_CACHE_REVALIDATION_SECRET), false);
  assert.equal(JSON.stringify(generated).includes(env.CLOUDFLARE_API_TOKEN), false);
  assert.notEqual(base.d1_databases[0].database_id, env.WEB_CACHE_STAGING_D1_ID);
});
