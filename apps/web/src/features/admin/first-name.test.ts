import { describe, expect, it } from 'vitest';

import { firstName } from './first-name';

describe('firstName', () => {
  it('keeps only the first name of a long full name, so the greeting fits in two lines', () => {
    expect(
      firstName('María Guadalupe Fernández de la Garza y Villaseñor Montemayor de los Santos'),
    ).toBe('María');
  });

  it('keeps a single name as it is', () => {
    expect(firstName('Jo')).toBe('Jo');
  });

  it('ignores extra spaces around and between words', () => {
    expect(firstName('  Lucía   Andrade ')).toBe('Lucía');
  });
});
