import { describe, expect, it } from 'vitest';

import { AgencyMemberRoleSchema, NotificationPreferencesSchema } from './platform.js';

describe('platform contracts', () => {
  it('does not treat the platform administrator flag as an agency role', () => {
    expect(AgencyMemberRoleSchema.safeParse('platform_admin').success).toBe(false);
    expect(AgencyMemberRoleSchema.parse('owner')).toBe('owner');
  });

  it('accepts an empty preferences object before notification templates exist', () => {
    expect(NotificationPreferencesSchema.parse({})).toEqual({});
  });

  it('rejects non-boolean notification preferences', () => {
    expect(NotificationPreferencesSchema.safeParse({ delivered: 'false' }).success).toBe(false);
  });
});
