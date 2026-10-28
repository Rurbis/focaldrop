import { parseConfigFileTextToJson } from 'typescript';

export function parseWranglerConfig(text) {
  const result = parseConfigFileTextToJson('wrangler.jsonc', text);
  if (result.error) throw new Error('Invalid Wrangler JSONC configuration.');
  return result.config;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCAL_D1_IDS = new Set([
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
]);

/** No remote calls. Local SQLite IDs must never reach a real deployment. */
export function deploymentProblems(env) {
  const problems = [];
  for (const name of ['WEB_CACHE_STAGING_D1_ID', 'WEB_CACHE_PREVIEW_D1_ID']) {
    const value = env[name] ?? '';
    if (value.length !== 36 || !UUID.test(value) || LOCAL_D1_IDS.has(value.toLowerCase()))
      problems.push(name);
  }
  if (env.WEB_CACHE_STAGING_D1_ID?.toLowerCase() === env.WEB_CACHE_PREVIEW_D1_ID?.toLowerCase()) {
    problems.push('distinct staging/preview D1 databases');
  }
  const secret = env.AGENCY_CACHE_REVALIDATION_SECRET ?? '';
  if (secret.length < 32 || secret.length > 256 || /[^A-Za-z0-9_-]/.test(secret)) {
    problems.push('AGENCY_CACHE_REVALIDATION_SECRET');
  }
  if (!env.CLOUDFLARE_API_TOKEN) problems.push('CLOUDFLARE_API_TOKEN');
  if (!env.CLOUDFLARE_ACCOUNT_ID) problems.push('CLOUDFLARE_ACCOUNT_ID');
  return problems;
}

export function deploymentConfig(base, env) {
  const problems = deploymentProblems(env);
  if (problems.length)
    throw new Error(`Missing or invalid deployment setup: ${problems.join(', ')}`);
  const config = structuredClone(base);
  config.d1_databases.find((item) => item.binding === 'NEXT_TAG_CACHE_D1').database_id =
    env.WEB_CACHE_STAGING_D1_ID;
  config.previews.d1_databases.find((item) => item.binding === 'NEXT_TAG_CACHE_D1').database_id =
    env.WEB_CACHE_PREVIEW_D1_ID;
  config.env['cache-preview'].d1_databases.find(
    (item) => item.binding === 'NEXT_TAG_CACHE_D1',
  ).database_id = env.WEB_CACHE_PREVIEW_D1_ID;
  return config;
}
