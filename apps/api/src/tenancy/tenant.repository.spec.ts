import { InternalServerErrorException } from '@nestjs/common';

import type { DatabaseService } from '../db/database.module.js';
import { agencyDomains } from '../db/schema/index.js';
import { TenantRepository } from './tenant.repository.js';

class DomainRepository extends TenantRepository<typeof agencyDomains> {
  read() {
    return this.selectForTenant({ id: agencyDomains.id });
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
