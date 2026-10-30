import { AuthUserSchema, authAdminRequest, findUserByEmail } from './auth-admin.js';
import { LOCAL_DEMO } from './demo.js';
import type { LocalSeedConfig } from './local-config.js';

export function localAuthAdmin(config: LocalSeedConfig) {
  const request = authAdminRequest(config.authUrl, config.secretKey);

  return {
    async ensureOwner(): Promise<{ id: string }> {
      const owner = await findUserByEmail(request, LOCAL_DEMO.ownerEmail);
      if (owner && owner.app_metadata?.focaldrop_local_seed !== true) {
        throw new Error('The demo email already belongs to an account not created by this seed.');
      }
      const attributes = {
        email: LOCAL_DEMO.ownerEmail,
        password: LOCAL_DEMO.ownerPassword,
        email_confirm: true,
        app_metadata: { ...owner?.app_metadata, focaldrop_local_seed: true },
        user_metadata: { full_name: LOCAL_DEMO.ownerName },
      };
      return AuthUserSchema.parse(
        await request(owner ? `users/${owner.id}` : 'users', owner ? 'PUT' : 'POST', attributes),
      );
    },
  };
}
