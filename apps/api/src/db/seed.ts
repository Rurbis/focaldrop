import { NotificationPreferencesSchema } from '@focaldrop/shared';
import { eq, sql } from 'drizzle-orm';

import type { createDatabase } from './database.js';
import { LOCAL_DEMO } from './demo.js';
import { agencies, agencyDomains, agencyMembers, profiles } from './schema/index.js';

type Database = ReturnType<typeof createDatabase>['db'];
type AuthAdmin = { ensureOwner(): Promise<{ id: string }> };

/** The caller must validate the local destination before opening either connection. */
export async function seedDemo(db: Database, auth: AuthAdmin) {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended('focaldrop-local-seed', 0))`,
    );
    await tx
      .insert(agencies)
      .values({
        slug: LOCAL_DEMO.slug,
        name: LOCAL_DEMO.agencyName,
        notificationEmail: LOCAL_DEMO.ownerEmail,
        notificationPreferences: NotificationPreferencesSchema.parse({}),
      })
      .onConflictDoNothing({ target: agencies.slug });
    const [agency] = await tx.select().from(agencies).where(eq(agencies.slug, LOCAL_DEMO.slug));
    if (!agency || agency.notificationEmail !== LOCAL_DEMO.ownerEmail) {
      throw new Error('The demo slug is already used by another agency; no data was overwritten.');
    }
    await tx
      .insert(agencyDomains)
      .values({
        agencyId: agency.id,
        hostname: LOCAL_DEMO.hostname,
        kind: 'custom',
        isPrimary: true,
      })
      .onConflictDoNothing({ target: agencyDomains.hostname });
    const [domain] = await tx
      .select()
      .from(agencyDomains)
      .where(eq(agencyDomains.hostname, LOCAL_DEMO.hostname));
    if (domain?.agencyId !== agency.id) {
      throw new Error('localhost is already assigned to another agency; no data was overwritten.');
    }
    const owner = await auth.ensureOwner();
    await tx
      .insert(profiles)
      .values({ id: owner.id, fullName: LOCAL_DEMO.ownerName })
      .onConflictDoNothing({ target: profiles.id });
    await tx
      .insert(agencyMembers)
      .values({ agencyId: agency.id, userId: owner.id, role: 'owner' })
      .onConflictDoUpdate({
        target: [agencyMembers.agencyId, agencyMembers.userId],
        set: { role: 'owner' },
      });
    return { agencyId: agency.id, ownerId: owner.id };
  });
}
