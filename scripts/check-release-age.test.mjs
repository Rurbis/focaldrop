import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classify,
  fetchPublishDates,
  main,
  parseExclusions,
  parseLockfilePackages,
  splitEntry,
  staleExemptions,
} from './check-release-age.mjs';

const NOW = Date.parse('2026-11-23T12:00:00Z');
const TWO_WEEKS = 20160;

/** @param {string[]} keys */
function lockfile(keys) {
  return [
    "lockfileVersion: '9.0'",
    '',
    'importers:',
    '',
    '  .:',
    '    devDependencies:',
    '      minimatch:',
    '        specifier: 11.0.5',
    '        version: 11.0.5',
    '',
    'packages:',
    '',
    ...keys.flatMap((key) => [`  ${key}:`, '    resolution: {integrity: sha512-x}', '']),
    'ignoredOptionalDependencies:',
    '  - sharp',
    '',
    'snapshots:',
    '',
    '  minimatch@11.0.5:',
    '    dependencies:',
    '      brace-expansion: 5.0.1',
    '',
  ].join('\n');
}

const daysAgo = (/** @type {number} */ days) =>
  new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString();

describe('parseLockfilePackages', () => {
  it('reads only the keys of the packages section, quoted or not', () => {
    const entries = parseLockfilePackages(lockfile(["'@babel/core@7.29.0'", 'minimatch@11.0.5']));
    assert.deepEqual([...entries], ['@babel/core@7.29.0', 'minimatch@11.0.5']);
  });

  it('reads Windows line endings', () => {
    const entries = parseLockfilePackages(lockfile(['minimatch@11.0.5']).replaceAll('\n', '\r\n'));
    assert.deepEqual([...entries], ['minimatch@11.0.5']);
  });

  it('refuses a lockfile version it does not know', () => {
    assert.throws(
      () => parseLockfilePackages("lockfileVersion: '10.0'\n"),
      /Unsupported lockfile version 10\.0/,
    );
  });
});

describe('splitEntry', () => {
  it('splits scoped and unscoped names', () => {
    assert.deepEqual(splitEntry('@babel/core@7.29.0'), { name: '@babel/core', version: '7.29.0' });
    assert.deepEqual(splitEntry('next@16.4.5'), { name: 'next', version: '16.4.5' });
  });
});

describe('parseExclusions', () => {
  it('accepts exact versions, alone or joined with ||', () => {
    const { exact, invalid } = parseExclusions(['next@16.4.6', '@scope/pkg@1.0.0 || 1.0.1']);
    assert.deepEqual(invalid, []);
    assert.deepEqual([...exact.get('next')], ['16.4.6']);
    assert.deepEqual([...exact.get('@scope/pkg')], ['1.0.0', '1.0.1']);
  });

  it('rejects whole packages, patterns and ranges', () => {
    const { invalid } = parseExclusions(['next', '@types/*', 'react@^19.0.0', 'vite@8.x']);
    assert.deepEqual(invalid, ['next', '@types/*', 'react@^19.0.0', 'vite@8.x']);
  });
});

describe('classify', () => {
  const exact = parseExclusions(['next@16.4.6']).exact;
  const publishedAt = new Map([
    ['minimatch@11.0.5', daysAgo(18)],
    ['minimatch@11.0.9', daysAgo(7)],
    ['jose@6.2.17', daysAgo(14)],
    ['next@16.4.6', daysAgo(2)],
    ['next@16.4.7', daysAgo(1)],
  ]);
  const result = classify({
    added: [
      'minimatch@11.0.5',
      'minimatch@11.0.9',
      'jose@6.2.17',
      'next@16.4.6',
      'next@16.4.7',
      'left-pad@https://example.com/left-pad.tgz',
      'nodate@1.0.0',
    ],
    exact,
    publishedAt,
    minimumMinutes: TWO_WEEKS,
    now: NOW,
  });

  it('fails versions younger than the minimum age, with the date they become allowed', () => {
    assert.deepEqual(
      result.young.map(({ entry, matureOn }) => [entry, matureOn]),
      [
        ['minimatch@11.0.9', '2026-11-30'],
        ['next@16.4.7', '2026-12-06'],
      ],
    );
  });

  it('lets a version through at exactly the minimum age', () => {
    assert.equal(
      result.young.some(({ entry }) => entry === 'jose@6.2.17'),
      false,
    );
  });

  it('exempts only the exact version listed', () => {
    assert.deepEqual(result.exempted, ['next@16.4.6']);
  });

  it('flags versions that do not come from the registry or have no date', () => {
    assert.deepEqual(result.notFromRegistry, ['left-pad@https://example.com/left-pad.tgz']);
    assert.deepEqual(result.missingDate, ['nodate@1.0.0']);
  });
});

describe('staleExemptions', () => {
  it('lists exemptions that are already old enough', () => {
    const { exact } = parseExclusions(['next@16.4.6', 'vite@8.0.16']);
    const publishedAt = new Map([
      ['next@16.4.6', daysAgo(2)],
      ['vite@8.0.16', daysAgo(20)],
    ]);
    assert.deepEqual(staleExemptions({ exact, publishedAt, minimumMinutes: TWO_WEEKS, now: NOW }), [
      'vite@8.0.16',
    ]);
  });
});

describe('fetchPublishDates', () => {
  it('asks the registry once per package, encoding scoped names', async () => {
    /** @type {string[]} */
    const urls = [];
    /** @type {typeof fetch} */
    const fakeFetch = async (url) => {
      urls.push(String(url));
      const time = { '7.29.0': daysAgo(30), '11.0.5': daysAgo(18), '11.0.9': daysAgo(7) };
      return new Response(JSON.stringify({ time }), { status: 200 });
    };
    const dates = await fetchPublishDates(
      [
        '@babel/core@7.29.0',
        'minimatch@11.0.5',
        'minimatch@11.0.9',
        'x@git+https://example.com/x.git',
      ],
      fakeFetch,
    );
    assert.deepEqual(urls.sort(), [
      'https://registry.npmjs.org/@babel%2fcore',
      'https://registry.npmjs.org/minimatch',
    ]);
    assert.equal(dates.get('minimatch@11.0.9'), daysAgo(7));
    assert.equal(dates.has('x@git+https://example.com/x.git'), false);
  });

  it('does not retry a package the registry does not have', async () => {
    let calls = 0;
    /** @type {typeof fetch} */
    const fakeFetch = async () => {
      calls++;
      return new Response('not found', { status: 404 });
    };
    await assert.rejects(fetchPublishDates(['missing@1.0.0'], fakeFetch), /404/);
    assert.equal(calls, 1);
  });
});

describe('main', () => {
  /**
   * @param {{ head: string[], base: string[], exclude?: string[], minimumMinutes?: number, dates: Record<string, string> }} setup
   */
  async function run({ head, base, exclude = [], minimumMinutes = TWO_WEEKS, dates }) {
    /** @type {string[]} */
    const lines = [];
    /** @type {string[]} */
    const asked = [];
    const code = await main(['--base', 'abc123'], {
      readSettings: () => ({ minimumMinutes, exclude }),
      readHeadLockfile: () => lockfile(head),
      readBaseLockfile: (ref) => {
        assert.equal(ref, 'abc123');
        return lockfile(base);
      },
      fetchPublishDates: async (entries) => {
        asked.push(...entries);
        return new Map(Object.entries(dates));
      },
      now: NOW,
      log: (line) => lines.push(line),
    });
    return { code, output: lines.join('\n'), asked };
  }

  it('passes when every new version is old enough, and only asks about new ones', async () => {
    const { code, output, asked } = await run({
      head: ['minimatch@11.0.5', 'glob@14.0.3'],
      base: ['minimatch@11.0.5'],
      dates: { 'glob@14.0.3': daysAgo(27) },
    });
    assert.equal(code, 0);
    assert.deepEqual(asked, ['glob@14.0.3']);
    assert.match(output, /1 package versions are new against abc123; the minimum age is 14 days/);
  });

  it('fails when a new version is too young', async () => {
    const { code, output } = await run({
      head: ['minimatch@11.0.9'],
      base: ['minimatch@11.0.5'],
      dates: { 'minimatch@11.0.9': daysAgo(7) },
    });
    assert.equal(code, 1);
    assert.match(
      output,
      /minimatch@11\.0\.9, published .* \(7\.0 days ago\), allowed from 2026-11-30/,
    );
  });

  it('passes a young version exempted by its exact version, and warns about stale exemptions', async () => {
    const { code, output } = await run({
      head: ['next@16.4.6'],
      base: ['next@16.4.5'],
      exclude: ['next@16.4.6', 'vite@8.0.16'],
      dates: { 'next@16.4.6': daysAgo(2), 'vite@8.0.16': daysAgo(20) },
    });
    assert.equal(code, 0);
    assert.match(output, /Exempted by minimumReleaseAgeExclude: next@16\.4\.6/);
    assert.match(output, /vite@8\.0\.16 is already 14 days old: remove it/);
  });

  it('refuses exemptions that are not exact versions', async () => {
    const { code, output } = await run({ head: [], base: [], exclude: ['next'], dates: {} });
    assert.equal(code, 1);
    assert.match(output, /only takes exact versions/);
  });

  it('fails when minimumReleaseAge is not set', async () => {
    const { code, output } = await run({ head: [], base: [], minimumMinutes: 0, dates: {} });
    assert.equal(code, 1);
    assert.match(output, /minimumReleaseAge is not set/);
  });
});
