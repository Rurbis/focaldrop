import { NotificationPreferencesSchema } from '@focaldrop/shared';
import { eq, sql } from 'drizzle-orm';

import type { createDatabase } from './database.js';
import { LOCAL_DEMO } from './demo.js';
import { agencies, agencyDomains, agencyMembers, profiles } from './schema/index.js';

type Database = ReturnType<typeof createDatabase>['db'];
type AuthAdmin = { ensureOwner(): Promise<{ id: string }> };

export interface AgencySpec {
  slug: string;
  agencyName: string;
  hostname: string;
  domainKind: 'platform_subdomain' | 'custom';
  ownerEmail: string;
  ownerName: string;
}

/**
 * Creates or reuses an agency, its primary domain and its owner. Running it again
 * changes nothing, and it never takes a slug or hostname from another agency.
 * The caller must validate the destination before opening either connection.
 */
export async function provisionAgency(db: Database, auth: AuthAdmin, spec: AgencySpec) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended('focaldrop-provision', 0))`);
    await tx
      .insert(agencies)
      .values({
        slug: spec.slug,
        name: spec.agencyName,
        notificationEmail: spec.ownerEmail,
        notificationPreferences: NotificationPreferencesSchema.parse({}),
      })
      .onConflictDoNothing({ target: agencies.slug });
    const [agency] = await tx.select().from(agencies).where(eq(agencies.slug, spec.slug));
    if (!agency || agency.notificationEmail !== spec.ownerEmail) {
      throw new Error('The slug is already used by another agency; no data was overwritten.');
    }
    await tx
      .insert(agencyDomains)
      .values({
        agencyId: agency.id,
        hostname: spec.hostname,
        kind: spec.domainKind,
        isPrimary: true,
      })
      .onConflictDoNothing({ target: agencyDomains.hostname });
    const [domain] = await tx
      .select()
      .from(agencyDomains)
      .where(eq(agencyDomains.hostname, spec.hostname));
    if (domain?.agencyId !== agency.id) {
      throw new Error(
        'The hostname is already assigned to another agency; no data was overwritten.',
      );
    }
    const owner = await auth.ensureOwner();
    await tx
      .insert(profiles)
      .values({ id: owner.id, fullName: spec.ownerName })
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

/** The local demo of the #15 seed. */
export function seedDemo(db: Database, auth: AuthAdmin) {
  return provisionAgency(db, auth, {
    slug: LOCAL_DEMO.slug,
    agencyName: LOCAL_DEMO.agencyName,
    hostname: LOCAL_DEMO.hostname,
    domainKind: 'custom',
    ownerEmail: LOCAL_DEMO.ownerEmail,
    ownerName: LOCAL_DEMO.ownerName,
  });
}
