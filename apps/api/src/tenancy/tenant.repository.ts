import { and, eq, type InferInsertModel, type SQL } from 'drizzle-orm';
import type { AnyPgColumn, PgTable, PgUpdateSetSource, SelectedFields } from 'drizzle-orm/pg-core';

import type { DatabaseService } from '../db/database.module.js';
import type { TenantContext } from './tenant.context.js';

type AgencyTable = PgTable & { agencyId: AnyPgColumn<{ data: string }> };

/**
 * Private repositories get their agency only from the request context (D59).
 * The returned builders already have their WHERE clause; callers can add joins,
 * limits or RETURNING, but cannot replace the agency filter through this API.
 * Public tenant discovery and administrative provisioning do not use this base.
 */
export abstract class TenantRepository<TTable extends AgencyTable> {
  constructor(
    private readonly database: Pick<DatabaseService, 'db'>,
    private readonly context: Pick<TenantContext, 'get'>,
    private readonly table: TTable,
  ) {}

  protected selectForTenant<TSelection extends SelectedFields>(
    fields: TSelection,
    ...conditions: SQL[]
  ) {
    const scope = this.scope(conditions);
    const table: PgTable = this.table;
    return this.database.db.select(fields).from(table).where(scope);
  }

  protected insertForTenant(values: Omit<InferInsertModel<TTable>, 'agencyId'>) {
    const agencyId = this.context.get().id;
    // Overwrite at runtime too, even if an unvalidated object bypasses TS.
    const row = { ...values, agencyId } as InferInsertModel<TTable>;
    return this.database.db.insert(this.table).values(row);
  }

  protected updateForTenant(
    values: Omit<PgUpdateSetSource<TTable>, 'agencyId'>,
    ...conditions: SQL[]
  ) {
    const agencyId = this.context.get().id;
    const changes = { ...values, agencyId } as PgUpdateSetSource<TTable>;
    return this.database.db.update(this.table).set(changes).where(this.scope(conditions));
  }

  protected deleteForTenant(...conditions: SQL[]) {
    const scope = this.scope(conditions);
    return this.database.db.delete(this.table).where(scope);
  }

  private scope(conditions: SQL[]): SQL {
    // With no additional predicate, this still selects only this agency.
    return and(eq(this.table.agencyId, this.context.get().id), ...conditions)!;
  }
}
