import type { PublicTenant } from '@focaldrop/shared';

import { TenancyService } from './tenancy.service.js';

const demo = {
  id: '0199e0a4-7c2b-7d3e-8f41-2a6b9c0d1e2f',
  slug: 'demo',
  name: 'Demo agency',
  status: 'active',
  timezone: 'America/Mexico_City',
  locale: 'es-MX',
  currency: 'MXN',
} satisfies PublicTenant;

function setup(environment: 'development' | 'production' = 'production', defaultSlug?: string) {
  const repository = {
    findByHostname: vi.fn<(hostname: string) => Promise<PublicTenant | undefined>>(),
    findBySlug: vi.fn<(slug: string) => Promise<PublicTenant | undefined>>(),
  };
  return { repository, service: new TenancyService(repository, { environment, defaultSlug }) };
}

describe('TenancyService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('resolves normalized registered hosts without falling back', async () => {
    const { repository, service } = setup('development', 'demo');
    repository.findByHostname.mockResolvedValue(demo);
    expect(await service.resolve('LOCALHOST:3000')).toEqual(demo);
    expect(repository.findByHostname).toHaveBeenCalledWith('localhost');
    expect(repository.findBySlug).not.toHaveBeenCalled();
  });

  it.each(['preview.example.com', undefined])(
    'falls back for an unknown/missing local host (%s)',
    async (header) => {
      const { repository, service } = setup('development', 'demo');
      repository.findBySlug.mockResolvedValue(demo);
      expect(await service.resolve(header)).toEqual(demo);
      expect(repository.findBySlug).toHaveBeenCalledWith('demo');
    },
  );

  it.each(['unknown.example.com', undefined])(
    'never falls back in production (%s)',
    async (header) => {
      const { repository, service } = setup('production', 'demo');
      await expect(service.resolve(header)).rejects.toMatchObject({ status: 404 });
      expect(repository.findBySlug).not.toHaveBeenCalled();
    },
  );

  it('returns 404 without a configured/available default agency', async () => {
    const first = setup('development');
    await expect(first.service.resolve('unknown.example.com')).rejects.toMatchObject({
      status: 404,
    });
    expect(first.repository.findBySlug).not.toHaveBeenCalled();
    const second = setup('development', 'demo');
    await expect(second.service.resolve(undefined)).rejects.toMatchObject({ status: 404 });
  });

  it('rejects malformed hosts before querying or falling back', async () => {
    const { repository, service } = setup('development', 'demo');
    await expect(service.resolve('https://localhost')).rejects.toMatchObject({ status: 400 });
    expect(repository.findByHostname).not.toHaveBeenCalled();
    expect(repository.findBySlug).not.toHaveBeenCalled();
  });

  it('does not replace a registered suspended agency with the default', async () => {
    const { repository, service } = setup('development', 'demo');
    repository.findByHostname.mockResolvedValue({ ...demo, status: 'suspended' });
    await expect(service.resolve('localhost')).rejects.toMatchObject({ status: 404 });
    expect(repository.findBySlug).not.toHaveBeenCalled();
  });

  it('rejects a suspended fallback too', async () => {
    const { repository, service } = setup('development', 'demo');
    repository.findBySlug.mockResolvedValue({ ...demo, status: 'suspended' });
    await expect(service.resolve(undefined)).rejects.toMatchObject({ status: 404 });
  });

  it('caches per normalized hostname and expires at exactly five minutes', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1000);
    const { repository, service } = setup();
    repository.findByHostname.mockResolvedValue(demo);
    await service.resolve('localhost');
    clock.mockReturnValue(300999);
    await service.resolve('LOCALHOST:3000');
    expect(repository.findByHostname).toHaveBeenCalledTimes(1);
    clock.mockReturnValue(301000);
    await service.resolve('localhost');
    expect(repository.findByHostname).toHaveBeenCalledTimes(2);
  });

  it('keeps distinct hosts in separate cache entries', async () => {
    const { repository, service } = setup();
    repository.findByHostname.mockResolvedValueOnce(demo).mockResolvedValueOnce({
      ...demo,
      id: '0199e0a4-7c2b-7d3e-8f41-2a6b9c0d1e30',
      slug: 'other',
    });
    const first = await service.resolve('alpha.example.com');
    const second = await service.resolve('beta.example.com');
    expect(first.id).not.toBe(second.id);
    expect(await service.resolve('alpha.example.com')).toBe(first);
    expect(await service.resolve('beta.example.com')).toBe(second);
  });

  it('does not cache misses so newly registered domains can resolve immediately', async () => {
    const { repository, service } = setup();
    await expect(service.resolve('new.example.com')).rejects.toMatchObject({ status: 404 });
    repository.findByHostname.mockResolvedValue(demo);
    expect(await service.resolve('new.example.com')).toEqual(demo);
  });

  it('evicts old entries instead of growing without a bound', async () => {
    const { repository, service } = setup();
    repository.findByHostname.mockResolvedValue(demo);
    for (let i = 0; i <= 1000; i++) await service.resolve('host-' + i + '.example.com');
    repository.findByHostname.mockClear();
    await service.resolve('host-1000.example.com');
    expect(repository.findByHostname).not.toHaveBeenCalled();
    await service.resolve('host-0.example.com');
    expect(repository.findByHostname).toHaveBeenCalledTimes(1);
  });

  it('propagates database outages without hiding them behind fallback', async () => {
    const { repository, service } = setup('development', 'demo');
    const failure = new Error('Synthetic database outage');
    repository.findByHostname.mockRejectedValue(failure);
    await expect(service.resolve('localhost')).rejects.toBe(failure);
    expect(repository.findBySlug).not.toHaveBeenCalled();
  });

  it('strips private settings and prevents mutation of shared cache objects', async () => {
    const { repository, service } = setup();
    repository.findByHostname.mockResolvedValue({
      ...demo,
      ...{ notificationEmail: 'private@example.invalid' },
    });
    const result = await service.resolve('localhost');
    expect(result).toEqual(demo);
    expect(Object.isFrozen(result)).toBe(true);
  });
});
