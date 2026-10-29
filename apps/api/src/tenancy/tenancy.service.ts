import { PublicTenantSchema, type PublicTenant } from '@focaldrop/shared';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { normalizeTenantHost } from './tenant-host.js';
import { TENANCY_OPTIONS, type TenancyOptions } from './tenancy.options.js';
import { TenancyRepository } from './tenancy.repository.js';

type TenantLookup = Pick<TenancyRepository, 'findByHostname' | 'findBySlug'>;
interface CacheEntry {
  tenant: PublicTenant;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 1000;

@Injectable()
export class TenancyService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @Inject(TenancyRepository) private readonly repository: TenantLookup,
    @Inject(TENANCY_OPTIONS) private readonly options: TenancyOptions,
  ) {}

  async resolve(header: string | string[] | undefined): Promise<PublicTenant> {
    const hostname = normalizeTenantHost(header);
    const cacheKey = hostname ?? '__missing_host__';
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.tenant;
    this.cache.delete(cacheKey);

    let tenant = hostname ? await this.repository.findByHostname(hostname) : undefined;
    if (!tenant && this.options.environment !== 'production' && this.options.defaultSlug) {
      tenant = await this.repository.findBySlug(this.options.defaultSlug);
    }
    // A registered suspended agency must not turn into the default agency.
    if (!tenant || tenant.status !== 'active') throw new NotFoundException('Tenant not found.');

    const publicTenant = Object.freeze(PublicTenantSchema.parse(tenant));
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) this.cache.delete(oldestKey);
    }
    this.cache.set(cacheKey, { tenant: publicTenant, expiresAt: Date.now() + CACHE_TTL_MS });
    return publicTenant;
  }
}
