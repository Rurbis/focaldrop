import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Defaults: no incremental cache yet. The tag cache for revalidateTag arrives
// with the pages that use it (#19, #20) and closes the S-4 spike (#21).
export default defineCloudflareConfig();
