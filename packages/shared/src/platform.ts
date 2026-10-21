import { z } from 'zod';

export const AGENCY_DOMAIN_KINDS = ['platform_subdomain', 'custom'] as const;
export const AGENCY_MEMBER_ROLES = ['owner', 'staff'] as const;

export const AgencyDomainKindSchema = z.enum(AGENCY_DOMAIN_KINDS);
export const AgencyMemberRoleSchema = z.enum(AGENCY_MEMBER_ROLES);

// Notification templates arrive in later milestones; preferences remain a map
// of template identifiers to booleans (Phase 1B §4).
export const NotificationPreferencesSchema = z.record(z.string().min(1).max(80), z.boolean());

export type AgencyDomainKind = z.infer<typeof AgencyDomainKindSchema>;
export type AgencyMemberRole = z.infer<typeof AgencyMemberRoleSchema>;
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;
