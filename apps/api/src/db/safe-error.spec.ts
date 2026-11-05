import { SafeError, safeErrorMessage } from './safe-error.js';

describe('safe error messages', () => {
  it('prints SafeError messages and hides any other error', () => {
    expect(safeErrorMessage(new SafeError('Known and safe.'), 'Fixed.')).toBe('Known and safe.');
    const drizzle = new Error('Failed query: insert into "agencies" … params: secret-slug,Secret');
    expect(safeErrorMessage(drizzle, 'Fixed.')).toBe('Fixed.');
    expect(safeErrorMessage('not an error', 'Fixed.')).toBe('Fixed.');
  });
});
