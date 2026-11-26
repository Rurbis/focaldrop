import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';

// Exercise the actual root config: removing its restriction must break this test.
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const eslint = new ESLint({
  cwd: root,
  overrideConfig: [tseslint.configs.disableTypeChecked],
});

async function violations(code: string, filePath = 'apps/api/src/tenancy/tenant.repository.ts') {
  const results = await eslint.lintText(code, { filePath });
  return results.flatMap((result) =>
    result.messages.filter((message) => message.ruleId === 'no-restricted-syntax'),
  );
}

describe('tenant query lint policy', () => {
  it.each([
    'query.$dynamic().where(condition);',
    'query.onConflictDoUpdate(options);',
    "query['$dynamic']().where(condition);",
    "query['onConflictDoUpdate'](options);",
  ])('rejects a tenant-scope escape: %s', async (code) => {
    expect(await violations(code)).toHaveLength(1);
  });

  it('allows scoped queries and returning', async () => {
    expect(await violations('repository.selectForTenant(fields, optional).limit(10);')).toEqual([]);
    expect(await violations('repository.insertForTenant(values).returning();')).toEqual([]);
  });

  it('preserves the administrative seed exception', async () => {
    expect(
      await violations('query.onConflictDoUpdate(options);', 'apps/api/src/db/seed.ts'),
    ).toEqual([]);
  });
});
