import { InternalServerErrorException } from '@nestjs/common';
import { eq, type SQL } from 'drizzle-orm';

import { createDatabase } from '../db/database.js';
import type { DatabaseService } from '../db/database.module.js';
import { agencyDomains } from '../db/schema/index.js';
import { TenantRepository } from './tenant.repository.js';

class DomainRepository extends TenantRepository<typeof agencyDomains> {
  read(...conditions: (SQL | undefined)[]) {
    return this.selectForTenant({ id: agencyDomains.id }, ...conditions);
  }
  create() {
    return this.insertForTenant({ hostname: 'test.example.com', kind: 'custom' });
  }
  change() {
    return this.updateForTenant({ hostname: 'changed.example.com' });
  }
  remove() {
    return this.deleteForTenant();
  }
}

describe('TenantRepository optional select predicates', () => {
  const agencyId = '0199e0a4-7c2b-7d3e-8f41-2a6b9c0d1e2f';
  const database = createDatabase('postgresql://unused:unused@127.0.0.1:1/unused');
  const repository = new DomainRepository(
    database,
    {
      get: () => ({
        id: agencyId,
        slug: 'demo',
        name: 'Demo agency',
        status: 'active',
        timezone: 'America/Mexico_City',
        locale: 'es-MX',
        currency: 'MXN',
      }),
    },
    agencyDomains,
  );

  afterAll(() => database.client.end());

  it('keeps the agency predicate when every optional filter is absent', () => {
    const query = repository.read(undefined).toSQL();
    expect(query.sql).toContain('where "agency_domains"."agency_id" = $1');
    expect(query.params).toEqual([agencyId]);
  });

  it('combines a provided filter with the agency while ignoring absent filters', () => {
    const query = repository
      .read(undefined, eq(agencyDomains.hostname, 'demo.example.com'), undefined)
      .toSQL();
    expect(query.sql).toContain(
      'where ("agency_domains"."agency_id" = $1 and "agency_domains"."hostname" = $2)',
    );
    expect(query.params).toEqual([agencyId, 'demo.example.com']);
  });
});

describe('TenantRepository without a request context', () => {
  it.each(['read', 'create', 'change', 'remove'] as const)(
    'rejects %s before touching the database',
    (operation) => {
      const touched = vi.fn();
      const database: Pick<DatabaseService, 'db'> = {
        get db(): DatabaseService['db'] {
          touched();
          throw new Error('Database should not be accessed.');
        },
      };
      const repository = new DomainRepository(
        database,
        {
          get: () => {
            throw new InternalServerErrorException('Tenant context is unavailable.');
          },
        },
        agencyDomains,
      );

      expect(() => repository[operation]()).toThrow('Tenant context is unavailable.');
      expect(touched).not.toHaveBeenCalled();
    },
  );
});
