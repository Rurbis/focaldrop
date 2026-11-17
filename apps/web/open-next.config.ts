import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// F1 needs no persistent cache. Cache storage and tag invalidation are
// evaluated with F6/S-4 (#21) and recorded in ADR-0010.
export default defineCloudflareConfig();
