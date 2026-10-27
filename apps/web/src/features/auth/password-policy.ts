// NIST SP 800-63B: at least 8 characters. Supabase hashes with bcrypt, which
// ignores everything after 72 bytes, so longer passwords are rejected instead
// of being silently cut. Kept apart from the Zod schemas so client components
// can read it without bundling Zod.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;
