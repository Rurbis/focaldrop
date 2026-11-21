import { AuthUserSchema, authAdminRequest, findUserByEmail } from './auth-admin.js';
import type { ProvisionConfig } from './provision-config.js';

/**
 * Finds or creates the owner's Auth account without a password: the owner sets
 * it with "forgot password", so no password goes through scripts, CI or logs.
 * An existing account is reused as it is, never modified.
 */
export function provisionAuthAdmin(config: ProvisionConfig) {
  const request = authAdminRequest(config.authUrl, config.secretKey);

  return {
    async ensureOwner(): Promise<{ id: string }> {
      const existing = await findUserByEmail(request, config.spec.ownerEmail);
      if (existing) return { id: existing.id };
      return AuthUserSchema.parse(
        await request('users', 'POST', {
          email: config.spec.ownerEmail,
          email_confirm: true,
          app_metadata: { focaldrop_provisioned: true },
          user_metadata: { full_name: config.spec.ownerName },
        }),
      );
    },
  };
}
