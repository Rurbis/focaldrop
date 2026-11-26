// Checks that every package version a pull request adds to pnpm-lock.yaml was
// published at least `minimumReleaseAge` minutes ago (D131).
//
// pnpm applies `minimumReleaseAge` whenever it picks a version, but
// `pnpm install --frozen-lockfile` does not re-check the versions a lockfile
// already has. A lockfile resolved elsewhere (by hand, by a bot, by an older
// pnpm) could slip a fresh release in, so CI compares the lockfile with the
// base branch and asks the npm registry when each new version was published.
//
// Exemptions come from `minimumReleaseAgeExclude` in pnpm-workspace.yaml, read
// through pnpm itself, and must name exact versions (`next@16.4.6`).
//
// Usage: node scripts/check-release-age.mjs [--base <git ref>]
//        The base defaults to origin/main.

import { execFileSync, execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const REGISTRY = 'https://registry.npmjs.org';
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/**
 * Package versions in the `packages:` section of a v9 pnpm lockfile, as
 * `name@version` strings.
 * @param {string} text
 * @returns {Set<string>}
 */
export function parseLockfilePackages(text) {
  const version = /^lockfileVersion: '?([^'\s]+)'?\s*$/m.exec(text)?.[1];
  if (version !== '9.0') {
    throw new Error(`Unsupported lockfile version ${version ?? '(none)'}: update this script.`);
  }
  const entries = new Set();
  let inPackages = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\S/.test(line)) {
      inPackages = line.startsWith('packages:');
      continue;
    }
    if (!inPackages) continue;
    const key = /^ {2}(?:'([^']+)'|([^\s'][^\s]*)):\s*$/.exec(line);
    if (key) entries.add(key[1] ?? key[2]);
  }
  return entries;
}

/**
 * @param {string} entry `name@version`, where the name may be scoped.
 * @returns {{ name: string, version: string }}
 */
export function splitEntry(entry) {
  const at = entry.indexOf('@', 1);
  if (at === -1) return { name: entry, version: '' };
  return { name: entry.slice(0, at), version: entry.slice(at + 1) };
}

/**
 * Reads `minimumReleaseAgeExclude`. Only exact versions are accepted
 * (`name@1.2.3`, or `name@1.2.3 || 1.2.4`): exempting a whole package or a
 * pattern would also let its future releases skip the wait.
 * @param {readonly string[]} list
 * @returns {{ exact: Map<string, Set<string>>, invalid: string[] }}
 */
export function parseExclusions(list) {
  const exact = new Map();
  const invalid = [];
  for (const raw of list) {
    const { name, version } = splitEntry(raw.trim());
    const versions = version.split('||').map((v) => v.trim());
    if (!name || name.includes('*') || !versions.every((v) => SEMVER.test(v))) {
      invalid.push(raw);
      continue;
    }
    const set = exact.get(name) ?? new Set();
    versions.forEach((v) => set.add(v));
    exact.set(name, set);
  }
  return { exact, invalid };
}

/**
 * Classifies the versions a change adds.
 * @param {{
 *   added: Iterable<string>,
 *   exact: Map<string, Set<string>>,
 *   publishedAt: Map<string, string | undefined>,
 *   minimumMinutes: number,
 *   now: number,
 * }} input `publishedAt` maps `name@version` to its ISO publish date.
 */
export function classify({ added, exact, publishedAt, minimumMinutes, now }) {
  /** @type {{ entry: string, publishedAt: string, days: number, matureOn: string }[]} */
  const young = [];
  /** @type {string[]} */
  const exempted = [];
  /** @type {string[]} */
  const notFromRegistry = [];
  /** @type {string[]} */
  const missingDate = [];
  for (const entry of added) {
    const { name, version } = splitEntry(entry);
    if (!SEMVER.test(version)) {
      notFromRegistry.push(entry);
      continue;
    }
    if (exact.get(name)?.has(version)) {
      exempted.push(entry);
      continue;
    }
    const date = publishedAt.get(entry);
    const time = date ? Date.parse(date) : NaN;
    if (Number.isNaN(time)) {
      missingDate.push(entry);
      continue;
    }
    if (now - time < minimumMinutes * MINUTE) {
      young.push({
        entry,
        publishedAt: date,
        days: (now - time) / DAY,
        matureOn: new Date(time + minimumMinutes * MINUTE).toISOString().slice(0, 10),
      });
    }
  }
  return { young, exempted, notFromRegistry, missingDate };
}

/**
 * Exemptions whose versions are already old enough: their entry can go.
 * @param {{
 *   exact: Map<string, Set<string>>,
 *   publishedAt: Map<string, string | undefined>,
 *   minimumMinutes: number,
 *   now: number,
 * }} input
 * @returns {string[]}
 */
export function staleExemptions({ exact, publishedAt, minimumMinutes, now }) {
  const stale = [];
  for (const [name, versions] of exact) {
    for (const version of versions) {
      const date = publishedAt.get(`${name}@${version}`);
      if (date && now - Date.parse(date) >= minimumMinutes * MINUTE) {
        stale.push(`${name}@${version}`);
      }
    }
  }
  return stale;
}

/**
 * Publish dates for the given entries, one registry request per package name.
 * @param {Iterable<string>} entries
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<Map<string, string | undefined>>}
 */
export async function fetchPublishDates(entries, fetchImpl = fetch) {
  const byName = new Map();
  for (const entry of entries) {
    const { name, version } = splitEntry(entry);
    if (!SEMVER.test(version)) continue;
    byName.set(name, [...(byName.get(name) ?? []), version]);
  }
  const result = new Map();
  const names = [...byName.keys()];
  const worker = async () => {
    for (let name = names.shift(); name; name = names.shift()) {
      const time = await fetchTimes(name, fetchImpl);
      for (const version of byName.get(name)) result.set(`${name}@${version}`, time[version]);
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  return result;
}

/**
 * The registry's `time` map for a package (full metadata: the abbreviated
 * format that installs use has no publish dates). Retries transient failures.
 * @param {string} name
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<Record<string, string>>}
 */
async function fetchTimes(name, fetchImpl) {
  const url = `${REGISTRY}/${name.replaceAll('/', '%2f')}`;
  const pause = (/** @type {number} */ attempt) =>
    new Promise((resolve) => setTimeout(resolve, attempt * 1000));
  for (let attempt = 1; ; attempt++) {
    let response;
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } });
    } catch (error) {
      if (attempt === 3) throw error;
      await pause(attempt);
      continue;
    }
    if (response.ok) {
      const metadata = /** @type {{ time?: Record<string, string> }} */ (await response.json());
      return metadata.time ?? {};
    }
    // A 4xx will not change on retry; a 5xx may.
    if (response.status < 500 || attempt === 3) throw new Error(`${response.status} from ${url}`);
    await pause(attempt);
  }
}

/**
 * Runs pnpm with the given arguments. Inside `pnpm run`, npm_execpath points
 * at the same pnpm; otherwise it is looked up on the PATH.
 * @param {string[]} args
 */
function pnpm(args) {
  const viaPnpm = process.env.npm_execpath;
  if (viaPnpm && /pnpm/i.test(viaPnpm)) {
    return execFileSync(process.execPath, [viaPnpm, ...args], { encoding: 'utf8' });
  }
  // Run directly with node: Windows only starts pnpm.cmd through a shell, so
  // the command goes as one string. Every argument is a fixed string above.
  return execSync(['pnpm', ...args].join(' '), { encoding: 'utf8' });
}

/** The two settings, read by pnpm itself from pnpm-workspace.yaml. */
function readSettings() {
  const minimumMinutes = Number(pnpm(['config', 'get', 'minimumReleaseAge']).trim());
  const exclude = JSON.parse(
    pnpm(['config', 'get', 'minimumReleaseAgeExclude', '--json']).trim() || '[]',
  );
  return { minimumMinutes, exclude: Array.isArray(exclude) ? exclude : [] };
}

/** @param {string} ref */
function readBaseLockfile(ref) {
  return execFileSync('git', ['show', `${ref}:pnpm-lock.yaml`], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

/**
 * @param {string[]} argv
 * @param {{
 *   readSettings: () => { minimumMinutes: number, exclude: string[] },
 *   readHeadLockfile: () => string,
 *   readBaseLockfile: (ref: string) => string,
 *   fetchPublishDates: (entries: Iterable<string>) => Promise<Map<string, string | undefined>>,
 *   now: number,
 *   log: (line: string) => void,
 * }} deps
 * @returns {Promise<number>} the exit code
 */
export async function main(argv, deps) {
  const baseIndex = argv.indexOf('--base');
  const base = baseIndex === -1 ? 'origin/main' : argv[baseIndex + 1];
  if (!base) throw new Error('--base needs a git ref.');

  const { minimumMinutes, exclude } = deps.readSettings();
  if (!Number.isInteger(minimumMinutes) || minimumMinutes <= 0) {
    deps.log('minimumReleaseAge is not set in pnpm-workspace.yaml (D131).');
    return 1;
  }
  const { exact, invalid } = parseExclusions(exclude);
  if (invalid.length > 0) {
    deps.log(
      'minimumReleaseAgeExclude only takes exact versions (name@1.2.3), so later releases still wait:',
    );
    invalid.forEach((entry) => deps.log(`  ${entry}`));
    return 1;
  }

  const head = parseLockfilePackages(deps.readHeadLockfile());
  const before = parseLockfilePackages(deps.readBaseLockfile(base));
  const added = [...head].filter((entry) => !before.has(entry)).sort();
  const exemptions = [...exact].flatMap(([name, versions]) =>
    [...versions].map((v) => `${name}@${v}`),
  );
  const publishedAt = await deps.fetchPublishDates([...added, ...exemptions]);

  const { now } = deps;
  const result = classify({ added, exact, publishedAt, minimumMinutes, now });
  const days = minimumMinutes / (24 * 60);
  deps.log(
    `${added.length} package versions are new against ${base}; the minimum age is ${days} days.`,
  );
  result.exempted.forEach((entry) => deps.log(`Exempted by minimumReleaseAgeExclude: ${entry}`));
  for (const entry of staleExemptions({ exact, publishedAt, minimumMinutes, now })) {
    deps.log(`${entry} is already ${days} days old: remove it from minimumReleaseAgeExclude.`);
  }

  let failed = false;
  if (result.young.length > 0) {
    failed = true;
    deps.log('Published too recently:');
    for (const { entry, publishedAt: date, days: age, matureOn } of result.young) {
      deps.log(
        `  ${entry}, published ${date} (${age.toFixed(1)} days ago), allowed from ${matureOn}`,
      );
    }
    deps.log('Wait for those dates, or exempt the exact version if it fixes a security advisory.');
  }
  if (result.notFromRegistry.length > 0) {
    failed = true;
    deps.log('Not a registry version, so its age cannot be checked: review it by hand.');
    result.notFromRegistry.forEach((entry) => deps.log(`  ${entry}`));
  }
  if (result.missingDate.length > 0) {
    failed = true;
    deps.log('The registry has no publish date for:');
    result.missingDate.forEach((entry) => deps.log(`  ${entry}`));
  }
  if (!failed) deps.log('Every new version is old enough.');
  return failed ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exitCode = await main(process.argv.slice(2), {
    readSettings,
    readHeadLockfile: () => readFileSync('pnpm-lock.yaml', 'utf8'),
    readBaseLockfile,
    fetchPublishDates: (entries) => fetchPublishDates(entries),
    now: Date.now(),
    log: (line) => console.log(line),
  });
}
