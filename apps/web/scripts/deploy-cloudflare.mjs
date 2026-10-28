import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { deploymentConfig, deploymentProblems, parseWranglerConfig } from './cloudflare-config.mjs';

const webDirectory = fileURLToPath(new URL('../', import.meta.url));
const [mode, ...args] = process.argv.slice(2);
if (!['staging', 'preview', 'check-preview'].includes(mode)) {
  throw new Error('Use staging, preview --name <name>, or check-preview.');
}
const problems = deploymentProblems(process.env);
if (mode === 'check-preview') {
  const ready = problems.length === 0;
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `ready=${ready}\n`);
  if (!ready) {
    const message = `F1 preview publication is pending setup: ${problems.join(', ')}. Worker build and local integration checks still run.`;
    console.log(`::warning::${message}`);
    if (process.env.GITHUB_STEP_SUMMARY) {
      await appendFile(
        process.env.GITHUB_STEP_SUMMARY,
        `### F1 preview publication pending\n\n${message}\n`,
      );
    }
  }
} else {
  // Fail before any remote operation, including cache initialization.
  if (problems.length)
    throw new Error(`Missing or invalid deployment setup: ${problems.join(', ')}`);
  const pnpm = process.env.npm_execpath;
  if (!pnpm) throw new Error('Run this command through pnpm.');
  const previewName = args[0] === '--name' && args.length === 2 ? args[1] : undefined;
  if (mode === 'preview' && (!previewName || !/^[a-z0-9-]+$/.test(previewName))) {
    throw new Error('A preview needs --name <lowercase-name>.');
  }
  const buildId = (await readFile(resolve(webDirectory, '.next/BUILD_ID'), 'utf8')).trim();
  const prefix = mode === 'preview' ? `${previewName}-` : 'staging-';
  if (process.env.CI && !buildId.startsWith(prefix)) {
    throw new Error('Build ID does not match the deployment target; rebuild for this environment.');
  }
  const base = parseWranglerConfig(await readFile(resolve(webDirectory, 'wrangler.jsonc'), 'utf8'));
  const config = deploymentConfig(base, process.env);
  config.main = resolve(webDirectory, config.main);
  config.assets.directory = resolve(webDirectory, config.assets.directory);
  const configFile = resolve(webDirectory, '.wrangler', `f1-${mode}.json`);
  await mkdir(resolve(webDirectory, '.wrangler'), { recursive: true });
  await writeFile(configFile, `${JSON.stringify(config, null, 2)}\n`);

  async function run(command, input) {
    const child = spawn(process.execPath, [pnpm, 'exec', ...command], {
      cwd: webDirectory,
      stdio: [input === undefined ? 'ignore' : 'pipe', 'inherit', 'inherit'],
      env: process.env,
    });
    if (input !== undefined) child.stdin.end(input);
    const [code] = await once(child, 'exit');
    if (code !== 0) throw new Error(`${command[0]} failed (${code}).`);
  }

  if (mode === 'staging') {
    await run(['opennextjs-cloudflare', 'deploy', '--config', configFile]);
  } else {
    await run([
      'opennextjs-cloudflare',
      'populateCache',
      'remote',
      '--env',
      'cache-preview',
      '--config',
      configFile,
    ]);
    await run(['wrangler', 'preview', '--name', previewName, '--config', configFile]);
  }
  // Never put the maintenance credential in a file, CLI argument or log.
  await run(
    [
      'wrangler',
      ...(mode === 'preview'
        ? ['preview', 'secret', 'bulk', '--name', previewName]
        : ['secret', 'bulk']),
      '--config',
      configFile,
    ],
    JSON.stringify({
      AGENCY_CACHE_REVALIDATION_SECRET: process.env.AGENCY_CACHE_REVALIDATION_SECRET,
    }),
  );
}
