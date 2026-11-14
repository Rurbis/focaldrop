import { describe, expect, it } from 'vitest';

import { isCurrentSection } from './nav';

describe('isCurrentSection', () => {
  it('marks the home only on the home itself', () => {
    expect(isCurrentSection('/admin', '/admin')).toBe(true);
    expect(isCurrentSection('/admin/', '/admin')).toBe(true);
  });

  it('does not keep the home marked inside another section', () => {
    expect(isCurrentSection('/admin/galleries', '/admin')).toBe(false);
  });

  it('marks a section on its pages', () => {
    expect(isCurrentSection('/admin/galleries', '/admin/galleries')).toBe(true);
    expect(isCurrentSection('/admin/galleries/0199e0a4', '/admin/galleries')).toBe(true);
  });

  it('does not confuse a section with another that starts with the same letters', () => {
    expect(isCurrentSection('/admin/galleries-archive', '/admin/galleries')).toBe(false);
  });
});
