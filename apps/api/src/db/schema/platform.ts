import {
  AGENCY_DOMAIN_KINDS,
  AGENCY_MEMBER_ROLES,
  AGENCY_STATUSES,
  DEFAULT_RETENTION_DAYS,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LOCALES,
  type NotificationPreferences,
} from '@focaldrop/shared';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const agencies = pgTable(
  'agencies',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    status: text('status', { enum: AGENCY_STATUSES }).notNull().default('active'),
    timezone: text('timezone').notNull().default('America/Mexico_City'),
    locale: text('locale', { enum: SUPPORTED_LOCALES }).notNull().default('es-MX'),
    currency: text('currency', { enum: SUPPORTED_CURRENCIES }).notNull().default('MXN'),
    notificationEmail: text('notification_email').notNull(),
    retentionDays: integer('retention_days').notNull().default(DEFAULT_RETENTION_DAYS),
    notificationPreferences: jsonb('notification_preferences')
      .$type<NotificationPreferences>()
      .notNull()
      .default({}),
    storagePolicyAcceptedAt: timestamp('storage_policy_accepted_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      'agencies_slug_check',
      sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(${table.slug}) BETWEEN 3 AND 63`,
    ),
    check('agencies_name_check', sql`char_length(trim(${table.name})) BETWEEN 1 AND 120`),
    check('agencies_status_check', sql`${table.status} IN ('active', 'suspended')`),
    check('agencies_locale_check', sql`${table.locale} = 'es-MX'`),
    check('agencies_currency_check', sql`${table.currency} = 'MXN'`),
    check('agencies_retention_days_check', sql`${table.retentionDays} > 0`),
    check(
      'agencies_preferences_check',
      sql`jsonb_typeof(${table.notificationPreferences}) = 'object'`,
    ),
  ],
).enableRLS();

export const agencyDomains = pgTable(
  'agency_domains',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    agencyId: uuid('agency_id')
      .notNull()
      .references(() => agencies.id, { onDelete: 'cascade' }),
    hostname: text('hostname').notNull().unique(),
    kind: text('kind', { enum: AGENCY_DOMAIN_KINDS }).notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
  },
  (table) => [
    index('agency_domains_agency_id_idx').on(table.agencyId),
    uniqueIndex('agency_domains_one_primary_idx')
      .on(table.agencyId)
      .where(sql`${table.isPrimary}`),
    check('agency_domains_kind_check', sql`${table.kind} IN ('platform_subdomain', 'custom')`),
    check(
      'agency_domains_hostname_check',
      sql`${table.hostname} = lower(${table.hostname}) AND char_length(${table.hostname}) BETWEEN 1 AND 253 AND ${table.hostname} !~ '[[:space:]:/]'`,
    ),
  ],
).enableRLS();

// Reference only: Supabase owns this table. It is deliberately not exported to
// Drizzle Kit, so migrations never create or change the Auth schema.
const authUsers = pgSchema('auth').table('users', { id: uuid('id').primaryKey() });

export const profiles = pgTable(
  'profiles',
  {
    // Auth generates this identifier; unlike application IDs, it is not UUID v7.
    id: uuid('id')
      .primaryKey()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    isPlatformAdmin: boolean('is_platform_admin').notNull().default(false),
    createdAt: createdAt(),
  },
  (table) => [
    check('profiles_full_name_check', sql`char_length(trim(${table.fullName})) BETWEEN 1 AND 120`),
  ],
).enableRLS();

export const agencyMembers = pgTable(
  'agency_members',
  {
    agencyId: uuid('agency_id')
      .notNull()
      .references(() => agencies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    role: text('role', { enum: AGENCY_MEMBER_ROLES }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.agencyId, table.userId] }),
    index('agency_members_user_id_idx').on(table.userId),
    check('agency_members_role_check', sql`${table.role} IN ('owner', 'staff')`),
  ],
).enableRLS();
