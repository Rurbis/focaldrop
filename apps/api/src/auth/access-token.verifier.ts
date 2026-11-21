import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, errors, jwtVerify, type JWTPayload } from 'jose';
import { z } from 'zod';

import { AUTH_OPTIONS, type AuthOptions } from './auth.options.js';

const UserIdSchema = z.uuid();

// What a bad token can cause. Anything else means the keys could not be read
// (Supabase down, wrong URL). That is not the user's fault, so it must not send
// them to the login page, and as an unexpected error it reaches Sentry.
const TOKEN_ERRORS = [
  errors.JOSEAlgNotAllowed,
  errors.JOSENotSupported,
  errors.JWKSMultipleMatchingKeys,
  errors.JWKSNoMatchingKey,
  errors.JWSInvalid,
  errors.JWSSignatureVerificationFailed,
  errors.JWTClaimValidationFailed,
  errors.JWTExpired,
  errors.JWTInvalid,
];

@Injectable()
export class AccessTokenVerifier {
  // jose caches the keys for 10 minutes. A token naming an unknown key makes it
  // fetch them again, at most once every 30 seconds, so rotation needs no restart.
  private readonly keys: ReturnType<typeof createRemoteJWKSet>;

  constructor(@Inject(AUTH_OPTIONS) private readonly options: AuthOptions) {
    this.keys = createRemoteJWKSet(new URL(options.jwksUrl));
  }

  /** Returns the user ID of a valid Supabase access token. */
  async verify(token: string): Promise<string> {
    const userId = UserIdSchema.safeParse((await this.readClaims(token)).sub);
    if (!userId.success) throw new UnauthorizedException();
    return userId.data;
  }

  private async readClaims(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, this.keys, {
        algorithms: ['ES256'],
        audience: this.options.audience,
        issuer: this.options.issuer,
        // jose only checks `exp` when the token has it.
        requiredClaims: ['exp', 'sub'],
      });
      return payload;
    } catch (error) {
      if (TOKEN_ERRORS.some((type) => error instanceof type)) throw new UnauthorizedException();
      throw error;
    }
  }
}
