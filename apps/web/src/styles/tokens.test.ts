import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// Reads the real tokens from globals.css, so a color edited there below the
// WCAG 2.2 AA minimum fails CI instead of shipping (D136).
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const tokens = new Map(
  [...css.matchAll(/--fd-([\w-]+):\s*light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)/gi)].map(
    ([, name = '', light = '', dark = '']) => [name, { light, dark }] as const,
  ),
);

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (high + 0.05) / (low + 0.05);
}

// [foreground, background, minimum]: 4.5 for text, 3 for field borders and
// focus indicators (WCAG 1.4.11).
const pairs: [string, string, number][] = [
  ['ink', 'paper', 4.5],
  ['ink', 'surface', 4.5],
  ['ink', 'raised', 4.5],
  ['ink-muted', 'paper', 4.5],
  ['ink-muted', 'surface', 4.5],
  ['ink-muted', 'raised', 4.5],
  ['accent', 'paper', 4.5],
  ['accent', 'surface', 4.5],
  ['on-accent', 'accent', 4.5],
  ['accent', 'accent-soft', 4.5],
  ['danger', 'paper', 4.5],
  ['danger', 'surface', 4.5],
  ['on-danger', 'danger', 4.5],
  ['danger', 'danger-soft', 4.5],
  ['success', 'success-soft', 4.5],
  ['warning', 'warning-soft', 4.5],
  ['field', 'surface', 3],
  ['field', 'paper', 3],
  // The focus ring of a menu item, over the item's focused tint and the menu.
  ['accent', 'raised', 3],
];

describe('design tokens', () => {
  it('parses every token used by the contrast pairs', () => {
    for (const [fg, bg] of pairs) {
      expect(tokens.has(fg), fg).toBe(true);
      expect(tokens.has(bg), bg).toBe(true);
    }
  });

  for (const mode of ['light', 'dark'] as const) {
    for (const [fg, bg, minimum] of pairs) {
      it(`${mode}: ${fg} on ${bg} reaches ${minimum}:1`, () => {
        const ratio = contrast(tokens.get(fg)![mode], tokens.get(bg)![mode]);
        expect(ratio).toBeGreaterThanOrEqual(minimum);
      });
    }
  }
});
