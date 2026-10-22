// Synthetic credentials, accepted only by guarded local scripts. Never use in staging.
export const LOCAL_DEMO = {
  slug: 'demo',
  agencyName: 'Demo agency',
  hostname: 'localhost',
  ownerName: 'Demo Owner',
  ownerEmail: 'owner@focaldrop.test',
  ownerPassword: 'Focaldrop-local-only-2026!',
  apiPassword: 'focaldrop_local_api',
} as const;
