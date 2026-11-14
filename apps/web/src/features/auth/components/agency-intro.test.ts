import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(new Headers({ host: 'agency.example.test' })),
}));

import { t } from '@/i18n/es-MX';

import { AgencyIntro } from './agency-intro';

const agency = {
  id: '0199e0a4-7c2b-7d3e-8f41-2a6b9c0d1e2f',
  slug: 'agency',
  name: 'Estudio de Prueba',
  status: 'active',
  timezone: 'America/Mexico_City',
  locale: 'es-MX',
  currency: 'MXN',
};
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('API_URL', 'https://api.example.test');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('AgencyIntro', () => {
  it('names the agency that answers for this host', async () => {
    fetchMock.mockResolvedValue(Response.json(agency));
    await expect(AgencyIntro()).resolves.toBe('Entra al panel de Estudio de Prueba.');
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toEqual(new URL('https://api.example.test/public/tenant'));
    expect(new Headers(init?.headers).get('X-Tenant-Host')).toBe('agency.example.test');
  });

  it('keeps the generic sentence when the host has no agency', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    await expect(AgencyIntro()).resolves.toBe(t.auth.login.intro);
  });

  it('keeps the generic sentence when the agency is suspended', async () => {
    fetchMock.mockResolvedValue(Response.json({ ...agency, status: 'suspended' }));
    await expect(AgencyIntro()).resolves.toBe(t.auth.login.intro);
  });

  it('keeps the generic sentence when the API is down, so login still works', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(AgencyIntro()).resolves.toBe(t.auth.login.intro);
  });
});
