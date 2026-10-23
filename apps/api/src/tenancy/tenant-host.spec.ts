import { normalizeTenantHost } from './tenant-host.js';

describe('normalizeTenantHost', () => {
  it.each([
    ['LOCALHOST:3000', 'localhost'],
    ['Photos.Example.com:443', 'photos.example.com'],
    ['photos.example.com.', 'photos.example.com'],
    [' localhost ', 'localhost'],
    ['127.0.0.1:3000', '127.0.0.1'],
    ['example.com:1', 'example.com'],
    ['example.com:65535', 'example.com'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeTenantHost(input)).toBe(expected);
  });

  it('distinguishes a missing header from a malformed one', () => {
    expect(normalizeTenantHost(undefined)).toBeUndefined();
  });

  it.each([
    '',
    ' ',
    'https://example.com',
    'example.com/path',
    'example.com?query',
    'example.com#fragment',
    'user@example.com',
    'example.com,other.com',
    'example.com:0',
    'example.com:65536',
    'example.com:abc',
    'example.com:',
    '-example.com',
    'example-.com',
    'exam_ple.com',
    'example..com',
    '.example.com',
    'example.com..',
    'ex ample.com',
    '[::1]:3000',
    'a'.repeat(64) + '.com',
    ['example.com', 'other.com'],
  ])('rejects malformed or ambiguous input %s', (input) => {
    expect(() => normalizeTenantHost(input)).toThrow('Invalid tenant host.');
  });

  it('enforces the hostname length separately from the port', () => {
    const maximum = [63, 63, 63, 61].map((length) => 'a'.repeat(length)).join('.');
    expect(normalizeTenantHost(maximum + ':443')).toBe(maximum);
    expect(() => normalizeTenantHost(maximum + 'a')).toThrow('Invalid tenant host.');
  });
});
