// Runs the visual tests inside the official Playwright image (Linux), the same
// image CI uses, so the reference images match on any machine (#52).
// Arguments go to `playwright test`, e.g. --update-snapshots.
// Needs Docker. The repo is mounted read-only and copied inside the container,
// so its Linux dependencies never touch the local node_modules or .next.
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const image = 'mcr.microsoft.com/playwright:v1.65.0-noble';
const root = fileURLToPath(new URL('../../../', import.meta.url)).replace(/[\\/]+$/, '');
const web = join(root, 'apps', 'web');
const outputs = {
  screenshots: join(web, 'e2e', '__screenshots__'),
  report: join(web, 'playwright-report'),
  results: join(web, 'test-results'),
};
for (const directory of Object.values(outputs)) mkdirSync(directory, { recursive: true });

// The image brings its own Node; the repo pins another one (.nvmrc, D142), so
// the script installs that one, verified against the official checksums, and
// keeps it with the pnpm store in a Docker volume between runs.
const script = String.raw`
set -euo pipefail
NODE_VERSION="$(tr -d '[:space:]' < /src/.nvmrc)"
NODE_DIR="/cache/node-v$NODE_VERSION"
if [ ! -x "$NODE_DIR/bin/node" ]; then
  cd /tmp
  TARBALL="node-v$NODE_VERSION-linux-x64.tar.gz"
  curl -fsSLO "https://nodejs.org/dist/v$NODE_VERSION/$TARBALL"
  curl -fsSLO "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt"
  grep " $TARBALL\$" SHASUMS256.txt | sha256sum -c -
  mkdir -p "$NODE_DIR"
  tar -xzf "$TARBALL" -C "$NODE_DIR" --strip-components=1
fi
export PATH="$NODE_DIR/bin:$PATH"
PNPM_VERSION="$(node -p "require('/src/package.json').packageManager.split('@')[1]")"
npm install --global --silent "pnpm@$PNPM_VERSION"
mkdir -p /work
tar -C /src --exclude=node_modules --exclude=.next --exclude=.turbo --exclude=.git \
  --exclude=.open-next --exclude=.wrangler --exclude=playwright-report --exclude=test-results \
  -cf - . | tar -C /work -xf -
cd /work
HUSKY=0 pnpm install --frozen-lockfile --store-dir /cache/pnpm-store --filter "@focaldrop/web..."
pnpm --filter @focaldrop/shared build
cd apps/web
set +e
pnpm exec playwright test "$@"
status=$?
set -e
cp -r e2e/__screenshots__/. /out/screenshots/
cp -r playwright-report/. /out/report/ 2>/dev/null || true
cp -r test-results/. /out/results/ 2>/dev/null || true
exit $status
`;

const result = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '--init',
    '--ipc=host',
    '--volume',
    `${root}:/src:ro`,
    '--volume',
    'focaldrop-visual-cache:/cache',
    '--volume',
    `${outputs.screenshots}:/out/screenshots`,
    '--volume',
    `${outputs.report}:/out/report`,
    '--volume',
    `${outputs.results}:/out/results`,
    image,
    'bash',
    '-c',
    script,
    'visual',
    ...process.argv.slice(2),
  ],
  { stdio: 'inherit' },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
